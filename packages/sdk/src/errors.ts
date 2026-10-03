/**
 * Every error the SDK throws comes from this file.
 *
 * The Forem API reports failures in two different shapes:
 *   - normal failures: `{"error": "not found", "status": 404}`
 *   - rate limiting:   plain text `Retry later`
 * Both are handled by `createError()`.
 */

export interface ErrorDetails {
  status: number;
  method: string;
  path: string;
  /** Raw response body, kept for debugging. */
  body: string;
}

export class DevToError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly body: string;

  constructor(message: string, details: ErrorDetails) {
    super(message);
    this.name = "DevToError";
    this.status = details.status;
    this.method = details.method;
    this.path = details.path;
    this.body = details.body;
  }
}

/** 401 — the API key is missing, wrong, or expired. */
export class AuthenticationError extends DevToError {
  constructor(details: ErrorDetails) {
    super("Authentication failed (401). Check your API key.", details);
    this.name = "AuthenticationError";
  }
}

/** 403 — the key is valid but not allowed to do this. */
export class ForbiddenError extends DevToError {
  constructor(details: ErrorDetails) {
    super("Forbidden (403). This API key does not have access.", details);
    this.name = "ForbiddenError";
  }
}

/** 404 — no such record. */
export class NotFoundError extends DevToError {
  constructor(details: ErrorDetails) {
    super("Not found (404).", details);
    this.name = "NotFoundError";
  }
}

/** 409 — the request conflicts with the current state. */
export class ConflictError extends DevToError {
  constructor(details: ErrorDetails) {
    super("Conflict (409). The resource is still in use.", details);
    this.name = "ConflictError";
  }
}

/** 422 — the API rejected the payload. `errors` lists the offending fields. */
export class ValidationError extends DevToError {
  readonly errors: string[];

  constructor(details: ErrorDetails, errors: string[] = []) {
    super(
      errors.length > 0
        ? `Validation failed (422): ${errors.join("; ")}`
        : "Validation failed (422).",
      details,
    );
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/** 429 — too many requests. `retryAfterSeconds` comes from the `Retry-After` header. */
export class RateLimitError extends DevToError {
  readonly retryAfterSeconds: number | undefined;

  constructor(details: ErrorDetails, retryAfterSeconds?: number) {
    super(
      retryAfterSeconds === undefined
        ? "Rate limited (429). Slow down."
        : `Rate limited (429). Retry in ${retryAfterSeconds}s.`,
      details,
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** 5xx — the server broke. */
export class ServerError extends DevToError {
  constructor(details: ErrorDetails) {
    super(`Server error (${details.status}).`, details);
    this.name = "ServerError";
  }
}

/** The request never reached the API (DNS, connection reset, timeout). */
export class ConnectionError extends DevToError {
  constructor(message: string, details: ErrorDetails) {
    super(message, details);
    this.name = "ConnectionError";
  }
}

/** Read the `error` and `errors` fields out of a response body, whatever shape it is. */
function parseErrorBody(body: string): { message: string; errors: string[] } {
  const trimmed = body.trim();
  if (trimmed === "") return { message: "", errors: [] };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) {
      return { message: trimmed, errors: [] };
    }
    const record = parsed as { error?: unknown; errors?: unknown };
    const message = typeof record.error === "string" ? record.error : "";
    const errors = Array.isArray(record.errors)
      ? record.errors.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      : [];
    return { message, errors };
  } catch {
    // Not JSON: this is the plain-text `Retry later` rate-limit body.
    return { message: trimmed, errors: [] };
  }
}

export function createError(
  status: number,
  body: string,
  method: string,
  path: string,
  retryAfterSeconds?: number,
): DevToError {
  const details: ErrorDetails = { status, method, path, body };
  const parsed = parseErrorBody(body);

  if (status === 401) return new AuthenticationError(details);
  if (status === 403) return new ForbiddenError(details);
  if (status === 404) return new NotFoundError(details);
  if (status === 409) return new ConflictError(details);
  if (status === 422) return new ValidationError(details, parsed.errors);
  if (status === 429) return new RateLimitError(details, retryAfterSeconds);
  if (status >= 500) return new ServerError(details);

  const message = parsed.message === "" ? `Request failed (${status}).` : parsed.message;
  return new DevToError(message, details);
}
