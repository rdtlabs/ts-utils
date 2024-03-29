/* ------------------------------------------------------------------------------------

  base64 - MIT License - Hexagon <hexagon@56k.guru>

  ------------------------------------------------------------------------------------

  License:

    Copyright (c) 2021 Hexagon <hexagon@56k.guru>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

  ------------------------------------------------------------------------------------  */

const // Regular base64 characters
chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  // Base64url characters
  charsUrl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  // deno-lint-ignore no-explicit-any
  genLookup = (target: any) => {
    const lookupTemp = typeof Uint8Array === "undefined"
      ? []
      : new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookupTemp[target.charCodeAt(i)] = i;
    }
    return lookupTemp;
  },
  // Use a lookup table to find the index.
  lookup = genLookup(chars),
  lookupUrl = genLookup(charsUrl);

type Base64 = {
  toArrayBuffer: (data: string, urlMode?: boolean) => ArrayBuffer;
  fromArrayBuffer: (arrBuf: ArrayBuffer, urlMode?: boolean) => string;
  fromBase64: (str: string, urlMode?: boolean) => string;
  toBase64: (str: string, urlMode?: boolean) => string;
  validate: (encoded: string, urlMode?: boolean) => boolean;
};

export const base64: Base64 = Object.freeze({
  /**
   * Convenience function for converting a base64 encoded string to an ArrayBuffer instance
   * @public
   *
   * @param {string} data - Base64 representation of data
   * @param {boolean} [urlMode] - If set to true, URL mode string will be expected
   * @returns {ArrayBuffer} - Decoded data
   */
  toArrayBuffer: (data: string, urlMode = false): ArrayBuffer => {
    const len = data.length;
    let bufferLength = data.length * 0.75,
      i,
      p = 0,
      encoded1,
      encoded2,
      encoded3,
      encoded4;

    if (data[data.length - 1] === "=") {
      bufferLength--;
      if (data[data.length - 2] === "=") {
        bufferLength--;
      }
    }

    const arraybuffer = new ArrayBuffer(bufferLength),
      bytes = new Uint8Array(arraybuffer),
      target = urlMode ? lookupUrl : lookup;

    for (i = 0; i < len; i += 4) {
      encoded1 = target[data.charCodeAt(i)];
      encoded2 = target[data.charCodeAt(i + 1)];
      encoded3 = target[data.charCodeAt(i + 2)];
      encoded4 = target[data.charCodeAt(i + 3)];

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  },

  /**
   * Convenience function for converting base64 encoded string to an ArrayBuffer instance
   * @public
   *
   * @param {ArrayBuffer} arrBuf - ArrayBuffer to be encoded
   * @param {boolean} [urlMode] - If set to true, URL mode string will be returned
   * @returns {string} - Base64 representation of data
   */
  fromArrayBuffer: (arrBuf: ArrayBuffer, urlMode = false): string => {
    const bytes = new Uint8Array(arrBuf);
    let i,
      result = "";

    const len = bytes.length,
      target = urlMode ? charsUrl : chars;

    for (i = 0; i < len; i += 3) {
      result += target[bytes[i] >> 2];
      result += target[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      result += target[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      result += target[bytes[i + 2] & 63];
    }

    if (len % 3 === 2) {
      result = result.substring(0, result.length - 1) + (urlMode ? "" : "=");
    } else if (len % 3 === 1) {
      result = result.substring(0, result.length - 2) + (urlMode ? "" : "==");
    }

    return result;
  },

  /**
   * Convenience function for converting base64 to string
   * @public
   *
   * @param {string} str - Base64 encoded string to be decoded
   * @param {boolean} [urlMode] - If set to true, URL mode string will be expected
   * @returns {string} - Decoded string
   */
  fromBase64: (str: string, urlMode = false): string => {
    return new TextDecoder().decode(base64.toArrayBuffer(str, urlMode));
  },

  /**
   * Convenience function for converting a javascript string to base64
   * @public
   *
   * @param {string} str - String to be converted to base64
   * @param {boolean} [urlMode] - If set to true, URL mode string will be returned
   * @returns {string} - Base64 encoded string
   */
  toBase64: (str: string, urlMode = false): string => {
    return base64.fromArrayBuffer(new TextEncoder().encode(str), urlMode);
  },

  /**
   * Function to validate base64
   * @public
   * @param {string} encoded - Base64 or Base64url encoded data
   * @param {boolean} [urlMode] - If set to true, base64url will be expected
   * @returns {boolean} - Valid base64/base64url?
   */
  validate: (encoded: string, urlMode = false): boolean => {
    // Bail out if not string
    // noinspection SuspiciousTypeOfGuard
    if (typeof encoded !== "string") {
      return false;
    }

    // Go on validate
    try {
      if (urlMode) {
        return /^[-A-Za-z0-9\-_]*$/.test(encoded);
      } else {
        return /^[-A-Za-z0-9+/]*={0,3}$/.test(encoded);
      }
    } catch (_e) {
      return false;
    }
  },
});
