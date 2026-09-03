import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertValidPosition, POSITION_STEP } from '../common/position.util';
import { reindexColumnsIfNeeded } from '../common/reindex.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

const columnSelect = {
  id: true,
  title: true,
  position: true,
  boardId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ColumnSelect;

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(boardId: string, dto: CreateColumnDto) {
    return this.prisma.$transaction(async (tx) => {
      let position = dto.position;

      if (position === undefined) {
        const last = await tx.column.aggregate({
          where: { boardId },
          _max: { position: true },
        });
        position = (last._max.position ?? 0) + POSITION_STEP;
      }

      assertValidPosition(position);

      return tx.column.create({
        data: { boardId, title: dto.title, position },
        select: columnSelect,
      });
    });
  }

  findAll(boardId: string) {
    return this.prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: {
        ...columnSelect,
        _count: { select: { tasks: true } },
      },
    });
  }

  async findOne(columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: {
        ...columnSelect,
        tasks: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            position: true,
            columnId: true,
            assignee: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return column;
  }

  async update(columnId: string, dto: UpdateColumnDto) {
    await this.requireColumn(columnId);

    return this.prisma.column.update({
      where: { id: columnId },
      data: { title: dto.title },
      select: columnSelect,
    });
  }

  async move(columnId: string, dto: MoveColumnDto) {
    assertValidPosition(dto.targetPosition, 'targetPosition');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.column.findUnique({
        where: { id: columnId },
        select: { id: true, boardId: true },
      });

      if (!existing) {
        throw new NotFoundException('Column not found');
      }

      await tx.column.update({
        where: { id: columnId },
        data: { position: dto.targetPosition },
      });

      const rebalanced = await reindexColumnsIfNeeded(tx, existing.boardId);

      const column = await tx.column.findUniqueOrThrow({
        where: { id: columnId },
        select: columnSelect,
      });

      return { column, rebalanced };
    });
  }

  async remove(columnId: string) {
    await this.requireColumn(columnId);

    await this.prisma.column.delete({ where: { id: columnId } });
    return { id: columnId, deleted: true };
  }

  private async requireColumn(columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { id: true, boardId: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return column;
  }
}
