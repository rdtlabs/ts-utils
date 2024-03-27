import { EncryptedData } from "./types.ts";

import { __decryptAsString, __stringToCryptoKey } from "./_utils.ts";

export * from "./types.ts";
export * from "./Secret.ts";

export async function decryptOnce<T>(
  key: string,
  data: EncryptedData,
): Promise<T> {
  const cryptoKey = __stringToCryptoKey(key);
  return JSON.parse(await __decryptAsString(cryptoKey, data));
}
