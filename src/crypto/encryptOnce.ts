import { EncryptedData } from "./types.ts";

import { __encrypt, __stringToCryptoKey } from "./_utils.ts";

export * from "./types.ts";
export * from "./Secret.ts";

export default function encryptOnce<T extends object>(
  key: string,
  data: T,
): Promise<EncryptedData> {
  try {
    const cryptoKey = __stringToCryptoKey(key);
    return __encrypt(cryptoKey, data);
  } catch (e) {
    return Promise.reject(e);
  }
}
