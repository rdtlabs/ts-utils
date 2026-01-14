import {
  InvalidArgumentError,
  NonRetryableError,
} from "../../errors/error.types.ts";

/**
 * A token bucket for rate limiting operations.
 * Tokens are consumed when operations execute and replenish over time.
 *
 * @example
 * ```ts
 * const bucket = TokenBucket(10, 1000); // 10 tokens, replenishes every second
 * if (bucket.consumeTokens(1)) {
 *   // Execute operation
 * } else {
 *   const waitTime = bucket.getTimeUntilConsumable(1);
 *   // Wait and retry
 * }
 * ```
 */
export interface TokenBucket {
  /**
   * Attempts to consume the specified number of tokens.
   *
   * @param tokens - Number of tokens to consume (must be positive and <= max balance)
   * @returns true if tokens were consumed, false if insufficient balance
   * @throws NonRetryableError if tokens exceeds the maximum token balance
   */
  consumeTokens(tokens: number): boolean;

  /**
   * Returns previously consumed tokens back to the bucket.
   * Useful for rollback scenarios when an operation fails after consuming tokens.
   *
   * @param tokens - Number of tokens to return (must be positive and <= max balance)
   */
  returnTokens(tokens: number): void;

  /**
   * Calculates the time in milliseconds until the specified number of tokens
   * will be available for consumption.
   *
   * @param tokens - Number of tokens needed (must be > current balance)
   * @returns Time in milliseconds until tokens are available
   * @throws InvalidArgumentError if tokens <= current balance
   */
  getTimeUntilConsumable(tokens: number): number;
}

/**
 * Creates a new TokenBucket instance with the specified capacity and replenishment rate.
 *
 * @param maxTokenBalance - Maximum number of tokens the bucket can hold
 * @param replenishInterval - Time in milliseconds to fully replenish from 0 to max (default: 1000)
 * @returns A new TokenBucket instance
 *
 * @example
 * ```ts
 * // Create a bucket allowing 100 operations per second
 * const bucket = TokenBucket(100, 1000);
 *
 * // Use static instances for special cases
 * const unlimited = TokenBucket.UNLIMITED; // Always succeeds
 * const blocked = TokenBucket.NON_RETRYABLE; // Always throws
 * ```
 */
export const TokenBucket = function (
  maxTokenBalance: number,
  replenishInterval = 1000,
) {
  return tokenBucket(maxTokenBalance, replenishInterval);
} as unknown as {
  new (): TokenBucket;
} & {
  /** A TokenBucket that always allows consumption (unlimited rate) */
  UNLIMITED: TokenBucket;
  /** A TokenBucket that always throws NonRetryableError (blocked) */
  NON_RETRYABLE: TokenBucket;
};

/**
 * A TokenBucket that always allows token consumption.
 * Useful for testing or when rate limiting should be disabled.
 */
TokenBucket.UNLIMITED = Object.seal({
  consumeTokens: () => true,
  returnTokens: () => {},
  getTimeUntilConsumable: () => 0,
}) as TokenBucket;

/**
 * A TokenBucket that always throws NonRetryableError on consumption.
 * Useful for blocking all operations without allowing retries.
 */
TokenBucket.NON_RETRYABLE = Object.seal({
  consumeTokens: () => {
    throw new NonRetryableError("No more tokens");
  },
  returnTokens: () => {},
  getTimeUntilConsumable: () => 0,
}) as TokenBucket;

Object.seal(TokenBucket);

/**
 * Creates a token bucket for rate limiting with automatic token replenishment.
 *
 * The bucket starts full and replenishes tokens linearly over time.
 * Tokens are consumed when operations are permitted and can be returned
 * if operations fail and need rollback.
 *
 * @param maxTokenBalance - Maximum number of tokens the bucket can hold (must be positive)
 * @param replenishIntervalMillis - Time in ms to replenish from 0 to max (default: 1000)
 * @returns A TokenBucket instance
 * @throws Error if maxTokenBalance or replenishIntervalMillis is not positive
 *
 * @example
 * ```ts
 * // Allow 5 operations per 500ms
 * const bucket = tokenBucket(5, 500);
 *
 * // Try to consume a token
 * if (bucket.consumeTokens(1)) {
 *   await performOperation();
 * } else {
 *   const delay = bucket.getTimeUntilConsumable(1);
 *   await sleep(delay);
 * }
 * ```
 */
export function tokenBucket(
  maxTokenBalance: number,
  replenishIntervalMillis = 1000,
): TokenBucket {
  const maxAllowedTokenBalance = maxTokenBalance;
  const replenishInterval = replenishIntervalMillis;
  let lastReplenished = Date.now();
  let balance = maxAllowedTokenBalance;

  if (!maxAllowedTokenBalance || maxAllowedTokenBalance <= 0) {
    throw new Error("Rate must be a positive number");
  }

  if (!replenishInterval || replenishInterval <= 0) {
    throw new Error("Interval must be positive number");
  }

  function validateTokenAmount(tokens: number): void {
    if (tokens < 1) {
      throw new Error("tokens must be a positive number");
    }

    if (tokens > maxAllowedTokenBalance) {
      throw new NonRetryableError(
        "tokens exceeds maxBalance. It is not possible for this operation to ever succeed based on the current max token balance setting.",
      );
    }
  }

  function ensureBalanceCurrent(): void {
    const now = Date.now();
    const elapsedTime = now - lastReplenished;
    const amountToAdd = Math.floor(
      (elapsedTime / replenishInterval) * maxAllowedTokenBalance,
    );

    // Add tokens for the time passed, up to the maximum allowed rate.
    balance = Math.min(balance + amountToAdd, maxAllowedTokenBalance);
    lastReplenished = now;
  }

  return Object.seal({
    consumeTokens(tokens: number): boolean {
      validateTokenAmount(tokens);

      ensureBalanceCurrent();

      if (tokens > balance) {
        return false;
      }

      // We have enough to withdraw
      balance -= tokens;

      return true;
    },

    returnTokens(tokens: number): void {
      validateTokenAmount(tokens);
      balance = Math.min(balance + tokens, maxAllowedTokenBalance);
    },

    // This should only be called when consumeTokens returns false,
    // otherwise the balance may no tbe up to date.
    getTimeUntilConsumable(tokens: number): number {
      validateTokenAmount(tokens);
      if (tokens <= balance) {
        throw new InvalidArgumentError({
          name: "tokens",
          message: "tokens must be greater than the current balance",
        });
      }

      const deficit = tokens - balance;
      return Math.ceil((deficit / maxAllowedTokenBalance) * replenishInterval);
    },
  });
}
