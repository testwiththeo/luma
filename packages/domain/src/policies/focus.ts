/**
 * Today Focus policy (PRD US-010, BR-003, BR-004).
 *
 * A board may have at most three active Today Focus tasks. Completing or
 * archiving a focus task clears its flag and frees a slot. The rule is enforced
 * atomically by the server.
 */

export const MAX_FOCUS = 3;

/** Whether another task may be added to Today Focus given the current active count. */
export function canAddFocus(currentActiveFocusCount: number): boolean {
  return currentActiveFocusCount < MAX_FOCUS;
}
