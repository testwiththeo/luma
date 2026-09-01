/**
 * Card ordering policy (SOFTWARE_ARCHITECTURE §9.3, BR-010).
 *
 * Cards use integer positions with gaps (1024, 2048, 3072, ...). Inserting
 * between two cards uses the integer midpoint. When no integer gap remains,
 * the caller must rebalance the affected column inside one transaction.
 *
 * Positions are unique per column and preserve deterministic order.
 */

export const POSITION_GAP = 1024;

/**
 * Compute a position between two neighbors.
 * - `before` is the position of the card above the insertion point (or null at the top).
 * - `after` is the position of the card below the insertion point (or null at the bottom).
 *
 * Returns the new integer position, or `null` when no integer gap remains
 * (the caller must then rebalance the column and retry).
 */
export function positionBetween(before: number | null, after: number | null): number | null {
  if (before === null && after === null) {
    return POSITION_GAP;
  }
  if (before === null && after !== null) {
    // Prepend: midpoint between 0 and the first card.
    const candidate = Math.floor(after / 2);
    return candidate > 0 && candidate < after ? candidate : null;
  }
  if (before !== null && after === null) {
    // Append after the last card.
    return before + POSITION_GAP;
  }
  // Insert between two cards.
  const lo = before as number;
  const hi = after as number;
  const candidate = Math.floor((lo + hi) / 2);
  return candidate > lo && candidate < hi ? candidate : null;
}

/** True when there is no integer position strictly between `before` and `after`. */
export function needsRebalance(before: number, after: number): boolean {
  return positionBetween(before, after) === null;
}

/** Produce `count` evenly gapped positions for a full-column rebalance. */
export function rebalance(count: number): number[] {
  const positions: number[] = [];
  for (let i = 1; i <= count; i++) {
    positions.push(i * POSITION_GAP);
  }
  return positions;
}
