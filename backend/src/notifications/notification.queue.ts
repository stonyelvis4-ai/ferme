import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import { Socket } from 'node:net';

interface RedisConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}

@Injectable()
export class NotificationQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueue.name);
  private readonly redisProbeTimeoutMs = 1500;
  private connection: RedisConnectionConfig | null = null;
  private queue: Queue<{ notificationId: string }> | null = null;
  private worker: Worker<{ notificationId: string }> | null = null;
  private redisAvailable = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    if (process.env.REDIS_ENABLED === 'false') {
      this.redisAvailable = false;
      this.logger.warn('Redis disabled by configuration. Cron fallback will handle reminders.');
      return;
    }

    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

    try {
      this.connection = this.parseRedisUrl(redisUrl);
      const reachable = await this.probeRedis(this.connection);

      if (!reachable) {
        this.redisAvailable = false;
        this.connection = null;
        this.logger.warn('Redis unavailable, queue mode disabled. Cron fallback will handle reminders.');
        return;
      }

      this.queue = new Queue('notification-reminders', {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000
          },
          removeOnComplete: 100,
          removeOnFail: 100
        }
      });

      this.worker = new Worker(
        'notification-reminders',
        async (job) => {
          const { NotificationService } = await import('./notification.service.js');
          const notificationService = this.moduleRef.get(NotificationService, {
            strict: false
          });

          await notificationService.dispatchNotification(job.data.notificationId);
        },
        {
          connection: this.connection
        }
      );

      await this.queue.waitUntilReady();
      await this.worker.waitUntilReady();

      this.worker.on('failed', (job, error) => {
        this.logger.error(
          `Notification job failed${job ? ` (${job.id})` : ''}: ${error.message}`,
          error.stack
        );
      });

      this.redisAvailable = true;
      this.logger.log('BullMQ notification queue connected to Redis.');
    } catch (error) {
      this.redisAvailable = false;
      this.logger.warn(
        `Redis unavailable, queue mode disabled. Cron fallback will handle reminders. Reason: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      await this.worker?.close().catch(() => undefined);
      await this.queue?.close().catch(() => undefined);
      this.connection = null;
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  isAvailable() {
    return this.redisAvailable && this.queue !== null;
  }

  async scheduleNotification(notificationId: string, scheduledFor: Date) {
    if (!this.queue) {
      return false;
    }

    const existing = await this.queue.getJob(notificationId);
    if (existing) {
      await existing.remove();
    }

    const delay = Math.max(0, scheduledFor.getTime() - Date.now());
    const options: JobsOptions = {
      jobId: notificationId,
      delay
    };

    await this.queue.add('dispatch-notification', { notificationId }, options);
    return true;
  }

  private parseRedisUrl(redisUrl: string): RedisConnectionConfig {
    const url = new URL(redisUrl);

    return {
      host: url.hostname,
      port: Number(url.port || '6379'),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined
    };
  }

  private probeRedis(connection: RedisConnectionConfig) {
    return new Promise<boolean>((resolve) => {
      const socket = new Socket();
      let settled = false;

      const finish = (result: boolean) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(this.redisProbeTimeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(connection.port, connection.host);
    });
  }
}
