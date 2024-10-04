export const chance = Object.freeze({
  random(useBufferCache): number {
    if (useBufferCache === true) {
      crypto.getRandomValues(buffer);
      return dataView.getUint32(0) / random_divisor;
    }

    const buf = new Uint8Array(4);
    const view = new DataView(buf.buffer);
    crypto.getRandomValues(buf);
    return view.getUint32(0) / random_divisor;
  },

  string(length): string {
    let result = "";
    const randomArray = globalThis.crypto.getRandomValues(
      new Uint8Array(length),
    );
    for (let i = 0; i < length; i++) {
      const randomIndex = randomArray[i] % charset.length;
      result += charset.charAt(randomIndex);
    }

    return result;
  },
}) as Chance;

type Chance = {
  /**
   * Generates a cryptographically random number in the range 0 <= x < 1.
   */
  random(useBufferCache?: boolean): number;

  /**
   * Generates a random string of the specified length.
   *
   * @param length - The length of the random string to generate.
   * @returns The randomly generated string.
   */
  string(length: number): string;
};

const charset =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const random_divisor = Math.pow(2, 32);
const buffer = new Uint8Array(4);
const dataView = new DataView(buffer.buffer);
