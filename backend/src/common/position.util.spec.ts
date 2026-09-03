import { BadRequestException } from '@nestjs/common';
import {
  assertValidPosition,
  computePosition,
  MAX_POSITION,
  needsRebalance,
  POSITION_STEP,
  rebalancedPositions,
} from './position.util';

describe('computePosition', () => {
  it('returns the step for an empty list', () => {
    expect(computePosition({})).toBe(POSITION_STEP);
  });

  it('halves the first position when prepending', () => {
    expect(computePosition({ next: 1024 })).toBe(512);
  });

  it('adds a buffer past the last position when appending', () => {
    expect(computePosition({ prev: 2048 })).toBe(2048 + POSITION_STEP);
  });

  it('returns the midpoint between two neighbours', () => {
    expect(computePosition({ prev: 1024, next: 2048 })).toBe(1536);
  });

  it('keeps strict ordering across repeated subdivisions', () => {
    let prev = 1024;
    const next = 2048;

    for (let i = 0; i < 20; i += 1) {
      const mid = computePosition({ prev, next });
      expect(mid).toBeGreaterThan(prev);
      expect(mid).toBeLessThan(next);
      prev = mid;
    }
  });
});

describe('needsRebalance', () => {
  it('is false for a healthy gap', () => {
    expect(needsRebalance(1024, 2048)).toBe(false);
  });

  it('is true once neighbours collapse together', () => {
    expect(needsRebalance(1024, 1024 + 1e-9)).toBe(true);
  });

  it('is false when a neighbour is missing', () => {
    expect(needsRebalance(undefined, 1024)).toBe(false);
    expect(needsRebalance(1024, null)).toBe(false);
  });
});

describe('rebalancedPositions', () => {
  it('produces evenly spaced ascending positions', () => {
    expect(rebalancedPositions(3)).toEqual([1024, 2048, 3072]);
  });

  it('handles an empty list', () => {
    expect(rebalancedPositions(0)).toEqual([]);
  });
});

describe('assertValidPosition', () => {
  it('accepts a normal position', () => {
    expect(() => assertValidPosition(1536)).not.toThrow();
  });

  it.each([NaN, Infinity, -Infinity])('rejects %p', (value) => {
    expect(() => assertValidPosition(value)).toThrow(BadRequestException);
  });

  it('rejects negatives', () => {
    expect(() => assertValidPosition(-1)).toThrow(BadRequestException);
  });

  it('rejects values beyond the safe range', () => {
    expect(() => assertValidPosition(MAX_POSITION * 10)).toThrow(
      BadRequestException,
    );
  });
});
