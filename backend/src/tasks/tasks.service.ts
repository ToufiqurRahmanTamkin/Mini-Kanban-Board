import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertValidPosition, POSITION_STEP } from '../common/position.util';
import { reindexTasksIfNeeded, TransactionClient } from '../common/reindex.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const userPreview = { id: true, name: true, email: true } as const;

const taskSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  columnId: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: userPreview },
  createdBy: { select: userPreview },
} satisfies Prisma.TaskSelect;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(columnId: string, authorId: string, dto: CreateTaskDto) {
    return this.prisma.$transaction(async (tx) => {
      const column = await tx.column.findUnique({
        where: { id: columnId },
        select: { id: true, boardId: true },
      });

      if (!column) {
        throw new NotFoundException('Column not found');
      }

      if (dto.assigneeId) {
        await this.assertAssignable(tx, column.boardId, dto.assigneeId);
      }

      let position = dto.position;
      if (position === undefined) {
        const last = await tx.task.aggregate({
          where: { columnId },
          _max: { position: true },
        });
        position = (last._max.position ?? 0) + POSITION_STEP;
      }

      assertValidPosition(position);

      return tx.task.create({
        data: {
          columnId,
          title: dto.title,
          description: dto.description ?? null,
          assigneeId: dto.assigneeId ?? null,
          createdById: authorId,
          position,
        },
        select: taskSelect,
      });
    });
  }

  findAllInColumn(columnId: string) {
    return this.prisma.task.findMany({
      where: { columnId },
      orderBy: { position: 'asc' },
      select: taskSelect,
    });
  }

  async findOne(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(taskId: string, dto: UpdateTaskDto) {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.assigneeId === undefined
    ) {
      throw new BadRequestException('Nothing to update');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: { id: true, column: { select: { boardId: true } } },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (dto.assigneeId) {
        await this.assertAssignable(tx, task.column.boardId, dto.assigneeId);
      }

      return tx.task.update({
        where: { id: taskId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description ?? null }
            : {}),
          ...(dto.assigneeId !== undefined
            ? { assigneeId: dto.assigneeId ?? null }
            : {}),
        },
        select: taskSelect,
      });
    });
  }

  async move(taskId: string, dto: MoveTaskDto) {
    assertValidPosition(dto.targetPosition, 'targetPosition');

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          columnId: true,
          column: { select: { boardId: true } },
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      const targetColumn = await tx.column.findUnique({
        where: { id: dto.targetColumnId },
        select: { id: true, boardId: true },
      });

      if (!targetColumn) {
        throw new NotFoundException('Target column not found');
      }

      if (targetColumn.boardId !== task.column.boardId) {
        throw new BadRequestException(
          'Source and target columns must belong to the same board',
        );
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: targetColumn.id,
          position: dto.targetPosition,
        },
      });

      const sourceColumnId = task.columnId;
      const touched = new Set([sourceColumnId, targetColumn.id]);

      let rebalanced = false;
      for (const columnId of touched) {
        rebalanced = (await reindexTasksIfNeeded(tx, columnId)) || rebalanced;
      }

      const moved = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        select: taskSelect,
      });

      return {
        task: moved,
        sourceColumnId,
        targetColumnId: targetColumn.id,
        rebalanced,
      };
    });
  }

  async remove(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({ where: { id: taskId } });
    return { id: taskId, deleted: true };
  }

  private async assertAssignable(
    tx: TransactionClient,
    boardId: string,
    assigneeId: string,
  ): Promise<void> {
    const board = await tx.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: { where: { userId: assigneeId }, select: { id: true }, take: 1 },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const allowed =
      board.ownerId === assigneeId || board.members.length > 0;

    if (!allowed) {
      throw new BadRequestException(
        'Assignee must be a member of this board',
      );
    }
  }
}
