/**
 * This module contains a crypto helper for managing encryption/decryption using
 * a secret/password. The implementation delegates to the standard crypto API's.
 * @module crypto
 */

import { chance } from "./chance.ts";

export * from "./types.ts";
export { Secret } from "./Secret.ts";
export { chance } from "./chance.ts";
export { encryptOnce } from "./encryptOnce.ts";
export { decryptOnce } from "./decryptOnce.ts";

export const generateRandomString = chance.string;
