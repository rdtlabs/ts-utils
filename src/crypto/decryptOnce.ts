import type { EncryptedData } from "./types.ts";

import { __decryptAsString, __stringToCryptoKey } from "./_utils.ts";

export * from "./types.ts";
export * from "./Secret.ts";

/**
 * Decrypts the given encrypted data using the provided key and returns the decrypted result.
 *
 * @param key - The encryption key used to decrypt the data.
 * @param data - The encrypted data to be decrypted.
 * @returns A Promise that resolves to the decrypted result.
 * @template T - The type of the decrypted result.
 */
export async function decryptOnce<T>(
  key: string,
  data: EncryptedData,
): Promise<T> {
  const cryptoKey = __stringToCryptoKey(key);
  return JSON.parse(await __decryptAsString(cryptoKey, data));
}
