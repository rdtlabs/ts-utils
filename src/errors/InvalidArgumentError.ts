import { __getErrorMessage } from "./_utils.ts";

export default class InvalidArgumentError extends Error {
  constructor(nameOrArgs?: string | { name?: string; message?: string }) {
    super(__getErrorMessage(nameOrArgs));
  }
}
