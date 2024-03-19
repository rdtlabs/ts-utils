const asNilOrInvalidName = (a: string, b: boolean) =>
  `Argument '${a}' is ${b ? "nil" : "invalid"}`;

const asNilOrInvalid = (b: boolean) => `Argument is ${b ? "nil" : "invalid"}`;

export function __getErrorMessage(
  args?: string | { name?: string; message?: string },
  isNil = false,
): string {
  if (!args) {
    return asNilOrInvalid(isNil);
  }

  if (typeof args === "string") {
    return asNilOrInvalidName(args, isNil);
  }

  if (!args.message) {
    return !args.name
      ? asNilOrInvalid(isNil)
      : asNilOrInvalidName(args.name, isNil);
  }

  if (!args.name) {
    return `${asNilOrInvalid(isNil)}\n${args.message}`;
  }

  return `Argument '${args.name}' is ${
    isNil ? "nil" : "invalid"
  }\n${args.message}`;
}
