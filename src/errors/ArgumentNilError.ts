import { InvalidArgumentError } from "./InvalidArgumentError.ts";
import { __getErrorMessage } from "./_utils.ts";

export class ArgumentNilError extends InvalidArgumentError {
  constructor(nameOrArgs?: string | { name?: string; message?: string }) {
    super(__getErrorMessage(nameOrArgs, true));
  }
}
