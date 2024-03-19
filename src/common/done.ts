export default class Done {
  private constructor() {}

  static is(value: unknown): value is Done {
    return value === Done;
  }
}
