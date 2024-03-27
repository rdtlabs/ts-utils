import { EncryptedData, EncryptionSource } from "./types.ts";

export const __keyLength = 32;

export function __getArrayBufferFor(data: EncryptionSource): ArrayBufferLike {
  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return data.buffer;
  }

  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  if (data instanceof Object) {
    return new TextEncoder().encode(JSON.stringify(data));
  }

  throw new Error("Invalid data type");
}

export async function __decryptAsString(
  key: Promise<CryptoKey> & { key: CryptoKey },
  cipherData: EncryptedData,
): Promise<string> {
  const clearBuf = await __decrypt(key, cipherData);
  return new TextDecoder().decode(clearBuf);
}

export async function __encrypt(
  key: Promise<CryptoKey> & { key: CryptoKey },
  data: EncryptionSource,
): Promise<EncryptedData> {
  const resolvedKey = key.key ?? await key;
  const encoded = __getArrayBufferFor(data);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    resolvedKey,
    encoded,
  );

  return {
    iv: iv.buffer,
    data: encrypted,
  };
}

export async function __decrypt(
  key: Promise<CryptoKey> & { key: CryptoKey },
  cipherData: EncryptedData,
): Promise<ArrayBuffer> {
  const resolvedKey = key.key ?? await key;
  const clearData = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: cipherData.iv,
    },
    resolvedKey,
    cipherData.data,
  );

  return clearData;
}

export function __stringToCryptoKey(
  secret: string,
): Promise<CryptoKey> & { key: CryptoKey } {
  const ensure64CharKeyFromKey = (key: string): string => {
    if (key.length === __keyLength) {
      return key;
    }

    if (key.length > __keyLength) {
      return key.substring(0, __keyLength);
    }

    let builder = key + key;
    while (builder.length < __keyLength) {
      builder += key;
    }

    return builder.substring(0, __keyLength);
  };

  let key: CryptoKey | undefined = undefined;
  const encoder = new TextEncoder();
  const stringBytes = encoder.encode(ensure64CharKeyFromKey(secret));
  const promise = new Promise<CryptoKey>((resolve, reject) => {
    try {
      globalThis.crypto.subtle.importKey(
        "raw",
        stringBytes,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"],
      ).then((k) => {
        resolve(key = k);
      }).catch(reject);
    } catch (e) {
      reject(e);
    }
  });

  return Object.defineProperty(promise, "key", {
    get: () => {
      return key;
    },
  }) as Promise<CryptoKey> & { key: CryptoKey };
}
