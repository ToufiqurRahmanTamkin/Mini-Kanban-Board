import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BoardAccessOptions,
  BoardAccessRequest,
  hasAtLeastRole,
} from '../board-access.types';
import { BOARD_ACCESS_KEY } from '../decorators/board-access.decorator';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const DEFAULT_PARAM: Record<string, string> = {
  board: 'boardId',
  column: 'columnId',
  task: 'taskId',
};

@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<BoardAccessOptions>(
      BOARD_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<BoardAccessRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const boardId = await this.resolveBoardId(request, options);
    const role = await this.resolveRole(boardId, user.id);

    if (!role) {
      throw new NotFoundException('Board not found');
    }

    const required =
      options.role ??
      (READ_METHODS.has(request.method) ? BoardRole.VIEWER : BoardRole.EDITOR);

    if (!hasAtLeastRole(role, required)) {
      throw new ForbiddenException(
        required === BoardRole.OWNER
          ? 'Only the board owner can perform this action'
          : 'Your role on this board does not allow this action',
      );
    }

    request.boardAccess = { boardId, role };
    return true;
  }

  private async resolveBoardId(
    request: BoardAccessRequest,
    options: BoardAccessOptions,
  ): Promise<string> {
    const source = options.source ?? 'board';
    const paramName = options.param ?? DEFAULT_PARAM[source];

    const raw =
      request.params?.[paramName] ??
      (source === 'board' ? request.params?.id : undefined) ??
      (source === 'column' ? request.params?.id : undefined) ??
      (source === 'task' ? request.params?.id : undefined) ??
      (typeof request.body?.[paramName] === 'string'
        ? (request.body[paramName] as string)
        : undefined);

    if (!raw) {
      throw new BadRequestException(
        `Missing ${paramName} required to authorise this request`,
      );
    }

    if (source === 'board') {
      return raw;
    }

    if (source === 'column') {
      const column = await this.prisma.column.findUnique({
        where: { id: raw },
        select: { boardId: true },
      });
      if (!column) {
        throw new NotFoundException('Column not found');
      }
      return column.boardId;
    }

    const task = await this.prisma.task.findUnique({
      where: { id: raw },
      select: { column: { select: { boardId: true } } },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task.column.boardId;
  }

  private async resolveRole(
    boardId: string,
    userId: string,
  ): Promise<BoardRole | null> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!board) {
      return null;
    }

    if (board.ownerId === userId) {
      return BoardRole.OWNER;
    }

    return board.members[0]?.role ?? null;
  }
}
