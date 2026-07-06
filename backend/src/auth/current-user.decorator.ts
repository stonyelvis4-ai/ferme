import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from './auth.service.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: SessionUser }>();
    return request.user;
  }
);
