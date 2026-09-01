/**
 * Work-in-progress (WIP) policy (PRD US-009, BR-005, BR-006).
 *
 * WIP counts all non-archived tasks in the target column (including Done and
 * Blocked). An unset limit (`null`) is unlimited. A limit of `0` means any
 * inbound task requires confirmation.
 *
 * WIP is a conscious override, not a hard block: the server requires explicit
 * confirmation for any operation that increases a limited column's count above
 * its limit (move, create, restore, unblock). Same-column reorder never counts.
 */

/** True when `resultingCount` would be strictly greater than `limit`. */
export function wouldExceedWip(limit: number | null, resultingCount: number): boolean {
  if (limit === null) return false;
  return resultingCount > limit;
}

export interface WipCheck {
  /** Column WIP limit, or null for unlimited. */
  limit: number | null;
  /** Current non-archived task count in the target column, before the operation. */
  currentCount: number;
  /** Whether this operation increases the target column's task count. */
  increasesCount: boolean;
}

/**
 * Whether an operation needs explicit WIP-overflow confirmation.
 * Only count-increasing operations against a set limit can require it.
 */
export function requiresWipConfirmation({
  limit,
  currentCount,
  increasesCount,
}: WipCheck): boolean {
  if (!increasesCount) return false;
  if (limit === null) return false;
  return wouldExceedWip(limit, currentCount + 1);
}
