import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

type Stub = ReturnType<typeof createPrismaStub>;

function createPrismaStub() {
  const tx = {
    task: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    column: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    board: {
      findUnique: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
    task: tx.task,
    column: tx.column,
    board: tx.board,
  };

  return { prisma, tx };
}

describe('TasksService.move', () => {
  let stub: Stub;
  let service: TasksService;

  beforeEach(() => {
    stub = createPrismaStub();
    service = new TasksService(stub.prisma as unknown as PrismaService);
  });

  it('moves a task into a sibling column on the same board', async () => {
    stub.tx.task.findUnique.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-a',
      column: { boardId: 'board-1' },
    });
    stub.tx.column.findUnique.mockResolvedValue({
      id: 'column-b',
      boardId: 'board-1',
    });
    stub.tx.task.findUniqueOrThrow.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-b',
      position: 1536,
    });

    const result = await service.move('task-1', {
      targetColumnId: 'column-b',
      targetPosition: 1536,
    });

    expect(stub.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(stub.tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { columnId: 'column-b', position: 1536 },
    });
    expect(result.sourceColumnId).toBe('column-a');
    expect(result.targetColumnId).toBe('column-b');
    expect(result.rebalanced).toBe(false);
  });

  it('refuses a target column that belongs to another board', async () => {
    stub.tx.task.findUnique.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-a',
      column: { boardId: 'board-1' },
    });
    stub.tx.column.findUnique.mockResolvedValue({
      id: 'column-x',
      boardId: 'board-2',
    });

    await expect(
      service.move('task-1', {
        targetColumnId: 'column-x',
        targetPosition: 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(stub.tx.task.update).not.toHaveBeenCalled();
  });

  it('404s for an unknown task', async () => {
    stub.tx.task.findUnique.mockResolvedValue(null);

    await expect(
      service.move('missing', {
        targetColumnId: 'column-b',
        targetPosition: 1024,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s for an unknown target column', async () => {
    stub.tx.task.findUnique.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-a',
      column: { boardId: 'board-1' },
    });
    stub.tx.column.findUnique.mockResolvedValue(null);

    await expect(
      service.move('task-1', {
        targetColumnId: 'missing',
        targetPosition: 1024,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a non-finite target position before touching the database', async () => {
    await expect(
      service.move('task-1', {
        targetColumnId: 'column-b',
        targetPosition: Number.NaN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(stub.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reports a rebalance when positions have collapsed', async () => {
    stub.tx.task.findUnique.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-a',
      column: { boardId: 'board-1' },
    });
    stub.tx.column.findUnique.mockResolvedValue({
      id: 'column-a',
      boardId: 'board-1',
    });
    stub.tx.task.findMany.mockResolvedValue([
      { id: 'task-1', position: 1024 },
      { id: 'task-2', position: 1024 + 1e-12 },
    ]);
    stub.tx.task.findUniqueOrThrow.mockResolvedValue({
      id: 'task-1',
      columnId: 'column-a',
      position: 1024,
    });

    const result = await service.move('task-1', {
      targetColumnId: 'column-a',
      targetPosition: 1024,
    });

    expect(result.rebalanced).toBe(true);
    expect(stub.tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { position: 1024 },
    });
    expect(stub.tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-2' },
      data: { position: 2048 },
    });
  });
});
