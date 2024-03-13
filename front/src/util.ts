export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function splitArray<T>(array: T[]): [T[], T[]] {
  const middle = Math.ceil(array.length / 2);
  const firstHalf = array.slice(0, middle);
  const secondHalf = array.slice(middle);
  return [firstHalf, secondHalf];
}

export const assertAddresse = (address: string): string => {
  // Checks if the address has the correct length and hex characters
  const re = /^(0x)[0-9a-fA-F]{40}$/;
  if (!re.test(address)) {
    throw new Error(`${address} is not a valid address`);
  }
  return address;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rand(digits: number): number {
  if (digits <= 0) {
    throw new Error("Digits must be a positive integer");
  }
  return Math.floor(Math.random() * (digits + 1));
}
