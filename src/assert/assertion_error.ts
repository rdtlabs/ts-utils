// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Error thrown when any assertion fails.
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}
