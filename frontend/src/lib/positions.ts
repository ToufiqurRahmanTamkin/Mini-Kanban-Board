export const POSITION_STEP = 1024;

export function positionForIndex(positions: number[], index: number): number {
  if (positions.length === 0) {
    return POSITION_STEP;
  }

  const clamped = Math.max(0, Math.min(index, positions.length));

  if (clamped === 0) {
    return positions[0] / 2;
  }

  if (clamped === positions.length) {
    return positions[positions.length - 1] + POSITION_STEP;
  }

  return (positions[clamped - 1] + positions[clamped]) / 2;
}

export function positionForDrop<T extends { position: number }>(
  items: T[],
  index: number,
): number {
  return positionForIndex(
    items.map((item) => item.position),
    index,
  );
}

export function byPosition<T extends { position: number; id: string }>(
  a: T,
  b: T,
): number {
  return a.position - b.position || a.id.localeCompare(b.id);
}
