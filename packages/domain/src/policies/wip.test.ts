import { describe, it, expect } from 'vitest';
import { wouldExceedWip, requiresWipConfirmation } from './wip.js';

describe('wouldExceedWip', () => {
  it('is false when the limit is unset (unlimited)', () => {
    expect(wouldExceedWip(null, 99)).toBe(false);
  });

  it('is false when the resulting count stays within the limit', () => {
    expect(wouldExceedWip(3, 2)).toBe(false);
  });

  it('is false when the resulting count exactly meets the limit', () => {
    expect(wouldExceedWip(3, 3)).toBe(false);
  });

  it('is true when the resulting count exceeds the limit', () => {
    expect(wouldExceedWip(3, 4)).toBe(true);
  });

  it('a limit of zero is exceeded by any inbound task', () => {
    expect(wouldExceedWip(0, 1)).toBe(true);
  });
});

describe('requiresWipConfirmation', () => {
  it('requires confirmation for an inbound move that exceeds the limit', () => {
    // moving into a column that currently holds 3 with limit 3 => resulting 4
    expect(requiresWipConfirmation({ limit: 3, currentCount: 3, increasesCount: true })).toBe(true);
  });

  it('never requires confirmation when the count does not increase (reorder)', () => {
    expect(requiresWipConfirmation({ limit: 0, currentCount: 5, increasesCount: false })).toBe(
      false,
    );
  });

  it('does not require confirmation when still within the limit', () => {
    expect(requiresWipConfirmation({ limit: 3, currentCount: 1, increasesCount: true })).toBe(
      false,
    );
  });

  it('does not require confirmation when the limit is unset', () => {
    expect(requiresWipConfirmation({ limit: null, currentCount: 100, increasesCount: true })).toBe(
      false,
    );
  });
});
