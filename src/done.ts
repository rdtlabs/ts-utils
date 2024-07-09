/**
 * Represents a special value indicating that an operation is done.
 */
export class Done {
  private constructor() {}

  /**
   * Checks if the given value is an instance of `Done`.
   * @param value - The value to check.
   * @returns `true` if the value is an instance of `Done`, `false` otherwise.
   */
  static is(value: unknown): value is Done {
    return value === Done;
  }
}
