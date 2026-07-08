import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { type AuditActionType, type AuditSource } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service.js';

function normalizeJson(value: unknown) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function resolveSource(headers: Record<string, string | string[] | undefined>): AuditSource {
  const raw = headers['x-fermp-source'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'mobile') {
    return 'MOBILE';
  }

  if (value === 'offline-sync') {
    return 'SYNCHRONISATION_HORS_LIGNE';
  }

  return 'WEB';
}

function resolveAction(method: string, path: string): AuditActionType {
  if (path.includes('/auth/session') || path.includes('/auth/register-admin') || path.includes('/auth/refresh')) {
    return 'CONNEXION';
  }

  if (path.includes('/auth/logout')) {
    return 'DECONNEXION';
  }

  if (method === 'POST') {
    return 'CREATION';
  }

  if (method === 'DELETE') {
    return 'SUPPRESSION';
  }

  if (path.includes('/archive')) {
    return 'ARCHIVAGE';
  }

  return 'MODIFICATION';
}

function resolveModule(path: string) {
  const farmMatch = path.match(/\/api\/farms\/[^/]+\/([^/?]+)/);
  if (farmMatch?.[1]) {
    return farmMatch[1];
  }

  const rootMatch = path.match(/\/api\/([^/?]+)/);
  return rootMatch?.[1] ?? 'systeme';
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<any>();
    const response = http.getResponse<any>();
    const path = request.originalUrl ?? request.url ?? '';
    const method = request.method ?? 'GET';

    if (request.user?.id) {
      void this.auditService.touchActivity(request.user.id).catch(() => undefined);
    }

    const shouldSkip =
      method === 'GET' ||
      path.startsWith('/api/audit') ||
      path.startsWith('/api/auth/session') ||
      path.startsWith('/api/auth/register-admin') ||
      path.startsWith('/api/auth/create-owner') ||
      path.startsWith('/api/auth/refresh') ||
      path.startsWith('/api/auth/logout') ||
      path.startsWith('/api/sync');
    return next.handle().pipe(
      tap((result) => {
        if (shouldSkip) {
          return;
        }

        const farmId = (request.params?.farmId as string | undefined) ?? (request.body?.farmId as string | undefined) ?? null;
        const actionType = resolveAction(method, path);
        const module = resolveModule(path);
        const entityType =
          (request.params?.userId ? 'User' : null) ??
          (request.params?.farmId ? 'Farm' : null) ??
          (request.body?.entityType as string | undefined) ??
          module;

        void this.auditService
          .record({
            farmId,
            userId: request.user?.id ?? null,
            userRole: request.user?.role ?? null,
            module,
            entityType,
            entityId:
              (request.params?.userId as string | undefined) ??
              (request.params?.id as string | undefined) ??
              (request.body?.entityId as string | undefined) ??
              null,
            entityLabel: (request.body?.title as string | undefined) ?? (request.body?.name as string | undefined) ?? null,
            actionType,
            source: resolveSource(request.headers),
            oldValue: normalizeJson((request as unknown as { auditOldValue?: unknown }).auditOldValue ?? null),
            newValue: normalizeJson(result),
            metadata: normalizeJson({
              method,
              path,
              statusCode: response.statusCode,
              params: request.params,
              query: request.query,
              source: resolveSource(request.headers)
            })
          })
          .catch(() => undefined);
      })
    );
  }
}
