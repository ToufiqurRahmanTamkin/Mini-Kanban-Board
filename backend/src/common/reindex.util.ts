import { Prisma } from '@prisma/client';
import { MIN_POSITION_GAP, rebalancedPositions } from './position.util';

export type TransactionClient = Prisma.TransactionClient;

function needsReindex(positions: number[]): boolean {
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i] - positions[i - 1] < MIN_POSITION_GAP) {
      return true;
    }
  }
  return false;
}

export async function reindexColumnsIfNeeded(
  tx: TransactionClient,
  boardId: string,
): Promise<boolean> {
  const columns = await tx.column.findMany({
    where: { boardId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: { id: true, position: true },
  });

  if (!needsReindex(columns.map((column) => column.position))) {
    return false;
  }

  const positions = rebalancedPositions(columns.length);
  await Promise.all(
    columns.map((column, index) =>
      tx.column.update({
        where: { id: column.id },
        data: { position: positions[index] },
      }),
    ),
  );

  return true;
}

export async function reindexTasksIfNeeded(
  tx: TransactionClient,
  columnId: string,
): Promise<boolean> {
  const tasks = await tx.task.findMany({
    where: { columnId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: { id: true, position: true },
  });

  if (!needsReindex(tasks.map((task) => task.position))) {
    return false;
  }

  const positions = rebalancedPositions(tasks.length);
  await Promise.all(
    tasks.map((task, index) =>
      tx.task.update({
        where: { id: task.id },
        data: { position: positions[index] },
      }),
    ),
  );

  return true;
}
