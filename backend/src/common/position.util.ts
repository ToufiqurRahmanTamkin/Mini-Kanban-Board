import { BadRequestException } from '@nestjs/common';

export const POSITION_STEP = 1024;

export const MIN_POSITION_GAP = 1e-6;

export const MAX_POSITION = 1e15;

export interface Neighbours {
  prev?: number | null;
  next?: number | null;
}

export function computePosition({ prev, next }: Neighbours): number {
  const hasPrev = typeof prev === 'number' && Number.isFinite(prev);
  const hasNext = typeof next === 'number' && Number.isFinite(next);

  if (hasPrev && hasNext) {
    return (prev! + next!) / 2;
  }
  if (hasPrev) {
    return prev! + POSITION_STEP;
  }
  if (hasNext) {
    return next! / 2;
  }
  return POSITION_STEP;
}

export function needsRebalance(prev?: number | null, next?: number | null): boolean {
  if (typeof prev !== 'number' || typeof next !== 'number') {
    return false;
  }
  return Math.abs(next - prev) < MIN_POSITION_GAP;
}

export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * POSITION_STEP);
}

export function assertValidPosition(position: number, field = 'position'): void {
  if (!Number.isFinite(position)) {
    throw new BadRequestException(`${field} must be a finite number`);
  }
  if (position < 0) {
    throw new BadRequestException(`${field} must not be negative`);
  }
  if (position > MAX_POSITION) {
    throw new BadRequestException(`${field} exceeds the maximum allowed value`);
  }
}
