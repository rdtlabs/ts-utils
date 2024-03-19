import { globalSelf } from "../globalSelf.ts";

export default function generateRandomString(length: number) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomArray = globalSelf.crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    const randomIndex = randomArray[i] % charset.length;
    result += charset.charAt(randomIndex);
  }

  return result;
}
