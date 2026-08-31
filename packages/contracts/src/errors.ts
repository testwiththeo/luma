import { z } from 'zod';

/**
 * Stable, machine-readable domain error codes.
 * These are part of the API contract and must not change casually.
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'COLUMN_NOT_IN_BOARD',
  'CONFLICT',
  'STALE_VERSION',
  'WIP_LIMIT_EXCEEDED',
  'WIP_CONFIRMATION_REQUIRED',
  'FOCUS_LIMIT_EXCEEDED',
  'BLOCKER_ALREADY_ACTIVE',
  'BLOCKER_REQUIRED_FIELDS',
  'INVALID_STATUS_TRANSITION',
  'BLOCKED_TRANSITION_NOT_ALLOWED',
  'TITLE_REQUIRED',
  'LABEL_NAME_DUPLICATE',
  'IMPORT_INVALID',
  'IMPORT_UNSUPPORTED_VERSION',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

/** HTTP status mapping for each error code (see PRD §17). */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  COLUMN_NOT_IN_BOARD: 400,
  CONFLICT: 409,
  STALE_VERSION: 409,
  WIP_LIMIT_EXCEEDED: 409,
  WIP_CONFIRMATION_REQUIRED: 409,
  FOCUS_LIMIT_EXCEEDED: 422,
  BLOCKER_ALREADY_ACTIVE: 422,
  BLOCKER_REQUIRED_FIELDS: 422,
  INVALID_STATUS_TRANSITION: 422,
  BLOCKED_TRANSITION_NOT_ALLOWED: 422,
  TITLE_REQUIRED: 422,
  LABEL_NAME_DUPLICATE: 422,
  IMPORT_INVALID: 422,
  IMPORT_UNSUPPORTED_VERSION: 422,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
};
