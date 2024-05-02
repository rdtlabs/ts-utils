import type { Func } from "../types.ts";

export type EncryptedData = {
  iv: ArrayBuffer;
  data: ArrayBuffer;
};

export type EncryptionSource =
  | string
  | Uint8Array
  | ArrayBuffer
  | Exclude<object, Func>;

export abstract class CryptoError extends Error {
  protected constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CryptoError";
    this.cause = cause ?? "cause origin not provided";
  }
}

export class EncryptionError extends CryptoError {
  // deno-lint-ignore no-explicit-any
  constructor(e: any) {
    super(
      e?.message ?? e?.toString() ?? "Failed to encrypt data.",
      e.cause ?? e,
    );
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends CryptoError {
  // deno-lint-ignore no-explicit-any
  constructor(e: any) {
    super(
      e?.message ?? e?.toString() ?? "Failed to decrypt data.",
      e.cause ?? e,
    );
    this.name = "DecryptionError";
  }
}
