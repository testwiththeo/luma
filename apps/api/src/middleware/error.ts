import type { Context, MiddlewareHandler } from 'hono';
import { ZodError } from 'zod';
import { ERROR_STATUS, type ErrorBody } from '@luma/contracts';
import { DomainError } from '@luma/domain';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Attach a request ID to every request/response for correlation. */
export const requestId: MiddlewareHandler = async (c, next) => {
  const id = c.req.header('x-request-id') ?? `req_${crypto.randomUUID()}`;
  c.set('requestId', id);
  c.header('x-request-id', id);
  await next();
};

function body(
  code: ErrorBody['error']['code'],
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): ErrorBody {
  const error: ErrorBody['error'] = { code, message, requestId };
  if (details) error.details = details;
  return { error };
}

/**
 * Convert thrown errors into the stable error contract. Expected domain
 * failures are not logged as crashes; only unexpected errors are logged (§8.2).
 */
export function errorHandler(err: Error, c: Context): Response {
  const reqId = (c.get('requestId') as string) ?? 'req_unknown';

  if (err instanceof DomainError) {
    const status = ERROR_STATUS[err.code] as ContentfulStatusCode;
    return c.json(body(err.code, err.message, reqId, err.details), status);
  }

  if (err instanceof ZodError) {
    return c.json(
      body('VALIDATION_ERROR', 'Request validation failed.', reqId, {
        issues: err.issues.map(({ path, message }) => ({ path, message })),
      }),
      400,
    );
  }

  // Unexpected: log without request bodies or user content.
  console.error(JSON.stringify({ level: 'error', requestId: reqId, message: err.message }));
  return c.json(
    body('INTERNAL_ERROR', 'An unexpected error occurred.', reqId),
    500 as ContentfulStatusCode,
  );
}
