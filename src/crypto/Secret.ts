import { Md5 } from "../md5.ts";
import {
  DecryptionError,
  type EncryptedData,
  EncryptionError,
  type EncryptionSource,
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

/**
 * Represents a secret key used for encryption and decryption.
 */
export class Secret {
  static #idCounter = 1;
  #id: number = Secret.#idCounter++;
  #refCount = 1;
  readonly #key: Promise<CryptoKey>;
  #dispose: () => void;

  private constructor(
    key: Promise<CryptoKey>,
    dispose: () => void,
  ) {
    this.#key = key;
    this.#dispose = dispose;
  }

  toString(): string {
    return `Secret[${this.#id}]`;
  }

  /**
   * Utility method to generate a random key.
   *
   * @returns A randomly generated string value.
   */
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

  /**
   * Creates a new Secret instance from the given key.
   * If a Secret instance with the same key already exists, it increments the reference count and returns the existing instance.
   * If a Secret instance with the same key does not exist, it creates a new instance and adds it to the internal keys map.
   * @param key - The key used to create the Secret instance.
   * @returns A Secret instance.
   */
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

  /**
   * Encrypts the given data using the secret key.
   *
   * @param data - The data to be encrypted.
   * @returns A promise that resolves to the encrypted data.
   * @throws {EncryptionError} If an error occurs during encryption.
   */
  public async encrypt(data: EncryptionSource): Promise<EncryptedData> {
    try {
      const key = await this.#key;
      return __encrypt(key, data);
    } catch (e) {
      return Promise.reject(new EncryptionError(e));
    }
  }

  /**
   * Decrypts the given cipher data using the secret key.
   *
   * @param cipherData The encrypted data to be decrypted.
   * @returns A promise that resolves to the decrypted data as an `ArrayBuffer`.
   * @throws {DecryptionError} If an error occurs during decryption.
   */
  public async decrypt(cipherData: EncryptedData): Promise<ArrayBuffer> {
    try {
      const key = await this.#key;
      return __decrypt(key, cipherData);
    } catch (e) {
      return Promise.reject(new DecryptionError(e));
    }
  }

  /**
   * Decrypts the given cipher data and returns the decrypted value as the specified type.
   *
   * @template T - The type of the decrypted value.
   * @param {EncryptedData} cipherData - The cipher data to decrypt.
   * @returns {Promise<T>} - A promise that resolves to the decrypted value of type T.
   * @throws {DecryptionError} - If an error occurs during decryption.
   */
  public async decryptAs<T>(cipherData: EncryptedData): Promise<T> {
    try {
      const key = await this.#key;
      const json = await __decryptAsString(key, cipherData);
      return JSON.parse(json);
    } catch (e) {
      throw new DecryptionError(e);
    }
  }

  /**
   * Decrypts the given cipher data and returns it as a string.
   *
   * @param cipherData - The encrypted data to decrypt.
   * @returns A promise that resolves to the decrypted string.
   * @throws {DecryptionError} If an error occurs during decryption.
   */
  public async decryptAsString(cipherData: EncryptedData): Promise<string> {
    try {
      const key = await this.#key;
      return __decryptAsString(key, cipherData);
    } catch (e) {
      return Promise.reject(new DecryptionError(e));
    }
  }

  /**
   * Invokes dispose()
   */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Disposes the secret and clears any sensitive data.
   */
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
