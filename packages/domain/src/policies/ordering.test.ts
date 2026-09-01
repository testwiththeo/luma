import { describe, it, expect } from 'vitest';
import { POSITION_GAP, positionBetween, needsRebalance, rebalance } from './ordering.js';

describe('positionBetween', () => {
  it('returns a gap-sized first position for an empty column', () => {
    expect(positionBetween(null, null)).toBe(POSITION_GAP);
  });

  it('appends after the last card using a full gap', () => {
    expect(positionBetween(1024, null)).toBe(2048);
  });

  it('prepends before the first card using the midpoint to zero', () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });

  it('inserts at the midpoint between two cards', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('signals no gap when neighbors are adjacent integers', () => {
    expect(positionBetween(1024, 1025)).toBeNull();
  });
});

describe('rebalance', () => {
  it('assigns evenly gapped positions preserving order', () => {
    expect(rebalance(3)).toEqual([1024, 2048, 3072]);
  });

  it('returns an empty array for an empty column', () => {
    expect(rebalance(0)).toEqual([]);
  });
});

describe('needsRebalance', () => {
  it('is true when the midpoint collapses onto a neighbor', () => {
    expect(needsRebalance(1024, 1025)).toBe(true);
  });

  it('is false when a gap remains', () => {
    expect(needsRebalance(1024, 2048)).toBe(false);
  });
});
