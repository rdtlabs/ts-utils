import type { EncryptedData } from "./types.ts";

import { __encrypt } from "./_utils.ts";

export * from "./types.ts";
export * from "./Secret.ts";

/**
 * Encrypts the given data using the provided key.
 *
 * @param key - The encryption key.
 * @param data - The data to be encrypted.
 * @returns A Promise that resolves to the encrypted data.
 * @throws If an error occurs during encryption.
 */
export async function encryptOnce<T extends object>(
  key: string,
  data: T,
): Promise<EncryptedData> {
  try {
    return await __encrypt(key, data);
  } catch (e) {
    throw new Error("Failed to encrypt data", { cause: e });
  }
}
