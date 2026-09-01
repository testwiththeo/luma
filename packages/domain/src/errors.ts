import type { ErrorCode } from '@luma/contracts';

/**
 * A domain error carries a stable machine-readable code and optional details.
 * The API layer maps these to HTTP responses; the domain never imports HTTP.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    if (details) this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found.`, { resource });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class WipConfirmationRequiredError extends DomainError {
  constructor(limit: number, current: number) {
    super('WIP_CONFIRMATION_REQUIRED', 'This move exceeds the column WIP limit.', {
      limit,
      current,
    });
    this.name = 'WipConfirmationRequiredError';
  }
}

export const titleRequired = (): DomainError =>
  new DomainError('TITLE_REQUIRED', 'Title must contain at least one non-whitespace character.');

export const columnNotInBoard = (): DomainError =>
  new DomainError('COLUMN_NOT_IN_BOARD', 'The selected column does not belong to this board.');

export const focusLimitExceeded = (max: number): DomainError =>
  new DomainError('FOCUS_LIMIT_EXCEEDED', `A board may have at most ${max} Today Focus tasks.`, {
    max,
  });

export const wipConfirmationRequired = (
  limit: number,
  current: number,
): WipConfirmationRequiredError => new WipConfirmationRequiredError(limit, current);

export const blockerAlreadyActive = (): DomainError =>
  new DomainError('BLOCKER_ALREADY_ACTIVE', 'This task already has an unresolved blocker.');

export const blockerRequiredFields = (): DomainError =>
  new DomainError('BLOCKER_REQUIRED_FIELDS', 'Blocking a task requires a category and a reason.');

export const blockedTransitionNotAllowed = (): DomainError =>
  new DomainError(
    'BLOCKED_TRANSITION_NOT_ALLOWED',
    'Use the block/unblock commands to enter or leave Blocked.',
  );

export const staleVersion = (): DomainError =>
  new DomainError('STALE_VERSION', 'The record was modified by another change.');
