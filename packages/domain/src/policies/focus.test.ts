import { describe, it, expect } from 'vitest';
import { MAX_FOCUS, canAddFocus } from './focus.js';

describe('Today Focus policy (BR-003)', () => {
  it('allows adding when below the maximum', () => {
    expect(canAddFocus(0)).toBe(true);
    expect(canAddFocus(MAX_FOCUS - 1)).toBe(true);
  });

  it('rejects adding a task beyond the maximum of three', () => {
    expect(MAX_FOCUS).toBe(3);
    expect(canAddFocus(MAX_FOCUS)).toBe(false);
  });
});
