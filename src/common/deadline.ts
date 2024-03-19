export type Deadline = {
  readonly remainingMillis: number;
  readonly isExpired: boolean;
};

export const Deadline = Object.freeze({
  after(timeoutMillis: number): Deadline {
    return deadline(timeoutMillis);
  },
  afterSeconds: (timeoutSeconds: number): Deadline => {
    return deadline(timeoutSeconds * 1000);
  },
  afterMinutes: (timeoutMinutes: number): Deadline => {
    return deadline(timeoutMinutes * 60 * 1000);
  },
  from: (date: Date): Deadline => {
    return deadline(date.getTime() - Date.now());
  },
  EXPIRED: Object.freeze({
    remainingMillis: 0,
    isExpired: true,
  }) as Deadline,
});

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

export class DeadlineExceededError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "DeadlineExceededError";
  }
}
