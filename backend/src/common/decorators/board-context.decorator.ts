import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BoardAccessContext, BoardAccessRequest } from '../board-access.types';

export const BoardContext = createParamDecorator(
  (data: keyof BoardAccessContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<BoardAccessRequest>();
    const access = request.boardAccess;

    if (!access) {
      return undefined;
    }

    return data ? access[data] : access;
  },
);
