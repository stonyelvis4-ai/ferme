import { TaskCategory, TaskRepeatRule, TaskStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service.js';
import {
  generateBootstrapTasks,
  type AgendaRuleTask
} from '@ferm-plus/domain-rules';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { ReminderService } from '../notifications/reminder.service.js';

export interface AgendaTaskView extends AgendaRuleTask {
  id: string;
  scheduledFor: string;
  scheduledLabel: string;
  status: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';
  category: TaskCategory;
  sourceModule: string | null;
  sourceRecordId: string | null;
  linkedModule: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedEntityLabel: string | null;
  reminderPreset: string | null;
  repeatRule: TaskRepeatRule;
  repeatEvery: number | null;
  notes: string | null;
}

export interface AgendaViewResponse {
  today: AgendaTaskView[];
  upcoming: AgendaTaskView[];
  completed: AgendaTaskView[];
  overdue: AgendaTaskView[];
  cancelled: AgendaTaskView[];
  alerts: Array<{
    id: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  }>;
}

@Injectable()
export class AgendaService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService,
    private readonly reminderService: ReminderService
  ) {}

  async getFarmAgenda(user: SessionUser, farmId: string): Promise<AgendaViewResponse> {
    const farm = await this.farmsService.getFarm(user, farmId);
    await this.ensurePersistedAgendaForFarm(farm);

    const [tasks, alerts] = await Promise.all([
      this.prisma.agendaTask.findMany({
        where: { farmId: farm.id },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }]
      }),
      this.prisma.alert.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const toView = (task: (typeof tasks)[number]): AgendaTaskView => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      scheduledFor: task.scheduledFor.toISOString(),
      scheduledLabel: task.scheduledLabel,
      status: task.status,
      category: task.category,
      sourceModule: task.sourceModule,
      sourceRecordId: task.sourceRecordId,
      linkedModule: task.linkedModule,
      linkedEntityType: task.linkedEntityType,
      linkedEntityId: task.linkedEntityId,
      linkedEntityLabel: task.linkedEntityLabel,
      reminderPreset: task.reminderPreset,
      repeatRule: task.repeatRule,
      repeatEvery: task.repeatEvery,
      notes: task.notes
    });

    return {
      today: tasks.filter((task) => this.isToday(task.scheduledFor) && task.status !== 'TERMINEE' && task.status !== 'ANNULEE').map(toView),
      upcoming: tasks
        .filter(
          (task) =>
            task.status !== 'TERMINEE' &&
            task.status !== 'EN_RETARD' &&
            task.status !== 'ANNULEE' &&
            !this.isToday(task.scheduledFor) &&
            task.scheduledFor.getTime() >= this.startOfToday().getTime()
        )
        .map(toView),
      completed: tasks.filter((task) => task.status === 'TERMINEE').map(toView),
      overdue: tasks.filter((task) => task.status === 'EN_RETARD').map(toView),
      cancelled: tasks.filter((task) => task.status === 'ANNULEE').map(toView),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        message: alert.message
      }))
    };
  }

  async createTask(
    user: SessionUser,
    farmId: string,
    input: {
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      scheduledFor: string;
      category?: TaskCategory;
      status?: TaskStatus;
      linkedModule?: string;
      linkedEntityType?: string;
      linkedEntityId?: string;
      linkedEntityLabel?: string;
      reminderPreset?: string;
      repeatRule?: TaskRepeatRule;
      repeatEvery?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const scheduledFor = new Date(input.scheduledFor);
    const normalizedStatus =
      input.status ?? (scheduledFor.getTime() < Date.now() ? 'EN_RETARD' : 'A_FAIRE');
    const linkedModule = input.linkedModule?.trim() || null;
    const linkedEntityType = input.linkedEntityType?.trim() || null;
    const linkedEntityId = input.linkedEntityId?.trim() || null;
    const linkedEntityLabel = input.linkedEntityLabel?.trim() || null;
    const reminderPreset = input.reminderPreset?.trim() || null;
    const repeatRule = input.repeatRule ?? 'NONE';
    const repeatEvery = repeatRule === 'CUSTOM' ? input.repeatEvery ?? null : null;

    const task = await this.prisma.agendaTask.create({
      data: {
        farmId: farm.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: normalizedStatus,
        category: input.category ?? TaskCategory.ADMINISTRATIF,
        scheduledFor,
        scheduledLabel: this.formatScheduledLabel(scheduledFor),
        sourceModule: linkedModule ?? 'MANUEL',
        sourceRecordId: linkedEntityId,
        linkedModule,
        linkedEntityType,
        linkedEntityId,
        linkedEntityLabel,
        reminderPreset,
        repeatRule,
        repeatEvery,
        notes: input.notes?.trim() || null
      }
    });

    await this.reminderService.syncTaskReminders(task);
    return this.mapTask(task);
  }

  async updateTask(
    user: SessionUser,
    farmId: string,
    taskId: string,
    input: {
      status?: TaskStatus;
      scheduledFor?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const updatePayload: {
      status?: TaskStatus;
      scheduledFor?: Date;
      scheduledLabel?: string;
    } = {};

    if (input.status) {
      updatePayload.status = input.status;
    }

    if (input.scheduledFor) {
      const scheduledFor = new Date(input.scheduledFor);
      updatePayload.scheduledFor = scheduledFor;
      updatePayload.scheduledLabel = this.formatScheduledLabel(scheduledFor);

      if (!input.status) {
        updatePayload.status = scheduledFor.getTime() < Date.now() ? 'EN_RETARD' : 'A_FAIRE';
      }
    }

    const updated = await this.prisma.agendaTask.update({
      where: {
        id: taskId,
        farmId: farm.id
      },
      data: updatePayload
    });

    await this.reminderService.syncTaskReminders(updated);
    if (updated.status === 'TERMINEE' && updated.repeatRule !== 'NONE') {
      await this.cloneRepeatedTask(updated);
    }

    return this.mapTask(updated);
  }

  private async cloneRepeatedTask(task: {
    farmId: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: TaskCategory;
    scheduledFor: Date;
    scheduledLabel: string;
    sourceModule: string | null;
    sourceRecordId: string | null;
    linkedModule: string | null;
    linkedEntityType: string | null;
    linkedEntityId: string | null;
    linkedEntityLabel: string | null;
    reminderPreset: string | null;
    repeatRule: TaskRepeatRule;
    repeatEvery: number | null;
    notes: string | null;
  }) {
    const nextScheduledFor = this.nextRepeatDate(task.scheduledFor, task.repeatRule, task.repeatEvery);
    if (!nextScheduledFor) {
      return;
    }

    const nextTask = await this.prisma.agendaTask.create({
      data: {
        farmId: task.farmId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        status: 'A_FAIRE',
        scheduledFor: nextScheduledFor,
        scheduledLabel: this.formatScheduledLabel(nextScheduledFor),
        sourceModule: task.sourceModule,
        sourceRecordId: task.sourceRecordId,
        linkedModule: task.linkedModule,
        linkedEntityType: task.linkedEntityType,
        linkedEntityId: task.linkedEntityId,
        linkedEntityLabel: task.linkedEntityLabel,
        reminderPreset: task.reminderPreset,
        repeatRule: task.repeatRule,
        repeatEvery: task.repeatEvery,
        notes: task.notes
      }
    });

    await this.reminderService.syncTaskReminders(nextTask);
  }

  private nextRepeatDate(baseDate: Date, repeatRule: TaskRepeatRule, repeatEvery: number | null) {
    if (repeatRule === 'NONE') {
      return null;
    }

    const next = new Date(baseDate);
    if (repeatRule === 'DAILY') {
      next.setDate(next.getDate() + 1);
      return next;
    }

    if (repeatRule === 'WEEKLY') {
      next.setDate(next.getDate() + 7);
      return next;
    }

    if (repeatRule === 'MONTHLY') {
      next.setMonth(next.getMonth() + 1);
      return next;
    }

    if (repeatRule === 'CUSTOM' && repeatEvery && repeatEvery > 0) {
      next.setDate(next.getDate() + repeatEvery);
      return next;
    }

    return null;
  }

  private mapTask(task: {
    id: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: TaskCategory;
    scheduledFor: Date;
    scheduledLabel: string;
    status: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';
    sourceModule: string | null;
    sourceRecordId: string | null;
    linkedModule: string | null;
    linkedEntityType: string | null;
    linkedEntityId: string | null;
    linkedEntityLabel: string | null;
    reminderPreset: string | null;
    repeatRule: TaskRepeatRule;
    repeatEvery: number | null;
    notes: string | null;
  }): AgendaTaskView {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      scheduledFor: task.scheduledFor.toISOString(),
      scheduledLabel: task.scheduledLabel,
      status: task.status,
      category: task.category,
      sourceModule: task.sourceModule,
      sourceRecordId: task.sourceRecordId,
      linkedModule: task.linkedModule,
      linkedEntityType: task.linkedEntityType,
      linkedEntityId: task.linkedEntityId,
      linkedEntityLabel: task.linkedEntityLabel,
      reminderPreset: task.reminderPreset,
      repeatRule: task.repeatRule,
      repeatEvery: task.repeatEvery,
      notes: task.notes
    };
  }

  private async ensurePersistedAgendaForFarm(farm: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
    activityType: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
  }) {
    const existingCount = await this.prisma.agendaTask.count({
      where: { farmId: farm.id }
    });

    if (existingCount > 0) {
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const generatedTasks = generateBootstrapTasks({
      farmName: farm.name,
      activityType: farm.activityType,
      hasLivestock:
        farm.activityType === 'ELEVAGE' ||
        farm.activityType === 'MIXTE' ||
        farm.activityType === 'PISCICULTURE',
      hasCrops: farm.activityType === 'CULTURE' || farm.activityType === 'MIXTE'
    });

    const bootstrapTasks: Array<{
      farmId: string;
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      status: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD';
      scheduledFor: Date;
      scheduledLabel: string;
    }> = generatedTasks.map((task, index) => ({
      farmId: farm.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'A_FAIRE' as const,
      scheduledFor: now,
      scheduledLabel: index === 0 ? "Aujourd'hui" : "Aujourd'hui - apres-midi"
    }));

    bootstrapTasks.push({
      farmId: farm.id,
      title: 'Revue hebdomadaire de performance',
      description: `Analyser les priorites de la ferme ${farm.name} pour la semaine.`,
      priority: 'MEDIUM',
      status: 'EN_COURS',
      scheduledFor: tomorrow,
      scheduledLabel: 'Demain matin'
    });

    if (farm.status === 'SUSPENDUE') {
      bootstrapTasks.push({
        farmId: farm.id,
        title: 'Verifier la reprise du planning',
        description: "La ferme est suspendue, confirmer la reprise avant d'activer les taches.",
        priority: 'HIGH',
        status: 'EN_RETARD',
        scheduledFor: now,
        scheduledLabel: 'En retard'
      });
    }

    await this.prisma.agendaTask.createMany({
      data: bootstrapTasks
    });

    const persistedTasks = await this.prisma.agendaTask.findMany({
      where: { farmId: farm.id }
    });

    for (const task of persistedTasks) {
      await this.reminderService.syncTaskReminders(task);
    }

    await this.prisma.alert.create({
      data: {
        farmId: farm.id,
        type: 'SYSTEM',
        priority: farm.status === 'SUSPENDUE' ? 'HIGH' : 'LOW',
        status: 'NEW',
        title: farm.status === 'SUSPENDUE' ? 'Planning suspendu' : 'Agenda initialise',
        severity: farm.status === 'SUSPENDUE' ? 'WARNING' : 'INFO',
        sourceModule: 'AGENDA',
        message:
          farm.status === 'SUSPENDUE'
            ? 'Certaines taches exigent une verification avant reprise.'
            : `L'agenda de ${farm.name} est pret pour la journee.`
      }
    });
  }

  private formatScheduledLabel(date: Date) {
    const startOfToday = this.startOfToday();

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfTarget = new Date(date);
    startOfTarget.setHours(0, 0, 0, 0);

    if (startOfTarget.getTime() === startOfToday.getTime()) {
      return "Aujourd'hui";
    }

    if (startOfTarget.getTime() === startOfTomorrow.getTime()) {
      return 'Demain';
    }

    if (startOfTarget.getTime() < startOfToday.getTime()) {
      return 'En retard';
    }

    return date.toLocaleDateString('fr-FR');
  }

  private startOfToday() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday;
  }

  private isToday(date: Date) {
    const startOfToday = this.startOfToday();
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    return date.getTime() >= startOfToday.getTime() && date.getTime() < startOfTomorrow.getTime();
  }
}
