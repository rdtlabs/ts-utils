import { Md5 } from "../md5.ts";
import {
  DecryptionError,
  EncryptedData,
  EncryptionError,
  EncryptionSource,
} from "./types.ts";
import {
  __decrypt,
  __decryptAsString,
  __encrypt,
  __keyLength,
  __stringToCryptoKey,
} from "./_utils.ts";

const secretKeyLength = __keyLength;
const runtimeHashSalt = Date.now().toString();
const keys = new Map<string, Secret>();

export class Secret {
  static #idCounter = 1;
  #id: number = Secret.#idCounter++;
  #refCount = 1;
  #key: Promise<CryptoKey> & { key: CryptoKey };
  #dispose: () => void;

  private constructor(
    key: Promise<CryptoKey> & { key: CryptoKey },
    dispose: () => void,
  ) {
    this.#key = key;
    this.#dispose = dispose;
  }

  toString(): string {
    return `Secret[${this.#id}]`;
  }

  static generateKey(): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomArray = globalThis.crypto.getRandomValues(
      new Uint8Array(secretKeyLength),
    );

    for (let i = 0; i < secretKeyLength; i++) {
      const randomIndex = randomArray[i] % charset.length;
      result += charset.charAt(randomIndex);
    }

    return result;
  }

  static of(key: string): Secret {
    const hashId = new Md5()
      .update(key)
      .update(runtimeHashSalt)
      .toString();

    const current = keys.get(hashId);
    if (current) {
      current.incrementRefCount();
      return current;
    }

    const cryptoKey = __stringToCryptoKey(key);
    const secret = new Secret(cryptoKey, () => {
      if (secret.decrementRefCount() === 0) {
        keys.delete(hashId);
      }
    });

    keys.set(hashId, secret);

    return secret;
  }

  public encrypt(data: EncryptionSource): Promise<EncryptedData> {
    try {
      return __encrypt(this.#key, data);
    } catch (e) {
      return Promise.reject(new EncryptionError(e));
    }
  }

  public decrypt(cipherData: EncryptedData): Promise<ArrayBuffer> {
    try {
      return __decrypt(this.#key, cipherData);
    } catch (e) {
      return Promise.reject(new DecryptionError(e));
    }
  }

  public async decryptAs<T>(cipherData: EncryptedData): Promise<T> {
    try {
      const json = await __decryptAsString(this.#key, cipherData);
      return JSON.parse(json);
    } catch (e) {
      throw new DecryptionError(e);
    }
  }

  public decryptAsString(cipherData: EncryptedData): Promise<string> {
    try {
      return __decryptAsString(this.#key, cipherData);
    } catch (e) {
      return Promise.reject(new DecryptionError(e));
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  dispose(): void {
    this.#dispose();
  }

  private incrementRefCount(): number {
    this.#refCount++;
    return this.#refCount;
  }

  private decrementRefCount(): number {
    this.#refCount--;
    return this.#refCount;
  }
}
