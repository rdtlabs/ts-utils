/**
 * Deadline type that can be used to correctly propagate deadlines
 * timeouts and cancellations.
 */
export interface Deadline {
  readonly remainingMillis: number;
  readonly isExpired: boolean;
}

/**
 * Utility object for creating deadlines.
 */
export const Deadline = Object.freeze({
  /**
   * Constructs a deadline that will expire after the specified milliseconds
   * @param timeoutMillis expires in milliseconds
   * @returns a deadline object that will expire after the specified time
   */
  after(timeoutMillis: number): Deadline {
    return deadline(timeoutMillis);
  },
  /**
   * Constructs a deadline that will expire after the specified seconds
   * @param timeoutSeconds expires in seconds
   * @returns a deadline object that will expire after the specified time
   */
  afterSeconds: (timeoutSeconds: number): Deadline => {
    return deadline(timeoutSeconds * 1000);
  },
  /**
   * Constructs a deadline that will expire after specified minutes
   * @param timeoutMinutes expires in minutes
   * @returns a deadline object that will expire after the specified time
   */
  afterMinutes: (timeoutMinutes: number): Deadline => {
    return deadline(timeoutMinutes * 60 * 1000);
  },
  /**
   * Constructs a deadline that will expire after the specified date
   * @param date expires on the specified date
   * @returns a deadline object that will expire after the specified time
   */
  from: (date: Date): Deadline => {
    return deadline(date.getTime() - Date.now());
  },
  /**
   * A deadline object that is already expired
   */
  EXPIRED: Object.freeze({
    remainingMillis: 0,
    isExpired: true,
  }) as Deadline,
}) as {
  after(timeoutMillis: number): Deadline;
  afterSeconds(timeoutSeconds: number): Deadline;
  afterMinutes(timeoutMinutes: number): Deadline;
  from(date: Date): Deadline;
  readonly EXPIRED: Deadline;
};

/**
 * Functionally constructs a deadline that will expire after the specified
 * milliseconds
 * @param timeoutMillis expires in milliseconds
 * @returns a deadline object that will expire after the specified time
 */
export function deadline(timeoutMillis: number): Deadline {
  if (timeoutMillis <= 0) {
    return Deadline.EXPIRED;
  }

  const deadline = Date.now() + timeoutMillis;
  return Object.defineProperties({}, {
    remainingMillis: {
      get: () => {
        const remaining = deadline - Date.now();
        return remaining > 0 ? remaining : 0;
      },
    },
    isExpired: {
      get: () => Date.now() > deadline,
    },
  }) as Deadline;
}

/**
 * Error thrown when a deadline is exceeded
 * @param message error message
 * @returns a DeadlineExceededError
 */
export class DeadlineExceededError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "DeadlineExceededError";
  }
}
