export function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomArray = globalThis.crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    const randomIndex = randomArray[i] % charset.length;
    result += charset.charAt(randomIndex);
  }

  return result;
}
