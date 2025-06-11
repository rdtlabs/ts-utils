import { Errors } from "../errors/errors.ts";
import type { EncryptedData, EncryptionSource } from "./types.ts";

export const __keyLength = 32;

export function __getArrayBufferFor(data: EncryptionSource): BufferSource {
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    return data;
  }

  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  if (data instanceof Object) {
    return new TextEncoder().encode(JSON.stringify(data));
  }

  throw new Error("Invalid data type");
}

export async function __decryptAsString<T extends string | CryptoKey>(
  key: T,
  cipherData: EncryptedData,
): Promise<string> {
  const clearBuf = await __decrypt(key, cipherData);
  return new TextDecoder().decode(clearBuf);
}

export async function __encrypt<T extends string | CryptoKey>(
  key: T,
  data: EncryptionSource,
): Promise<EncryptedData> {
  const resolvedKey = await __keyToCryptoKey(key);
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

export async function __decrypt<T extends string | CryptoKey>(
  key: T,
  cipherData: EncryptedData,
): Promise<ArrayBuffer> {
  const resolvedKey = await __keyToCryptoKey(key);
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
  algorithm:
    | AlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams
    | HmacImportParams
    | AesKeyAlgorithm = { name: "AES-GCM" },
  keyUsages: Iterable<KeyUsage> = ["encrypt", "decrypt"],
  extractable = true,
): Promise<CryptoKey> {
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

  const encoder = new TextEncoder();
  const stringBytes = encoder.encode(ensure64CharKeyFromKey(secret));
  return new Promise<CryptoKey>((resolve) => {
    globalThis.crypto.subtle.importKey(
      "raw",
      stringBytes,
      algorithm,
      extractable,
      keyUsages,
    )
      .then(resolve)
      .catch((e) => Errors.resolve(e, "Failed to create key"));
  });
}

async function __keyToCryptoKey(
  secret: string | CryptoKey,
): Promise<CryptoKey> {
  return typeof secret === "string"
    ? await __stringToCryptoKey(secret)
    : secret;
}
