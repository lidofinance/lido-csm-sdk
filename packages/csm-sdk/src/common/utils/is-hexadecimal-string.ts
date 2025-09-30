export const isHexadecimalString = (
  input: string,
  length?: number,
): boolean => {
  if (typeof input !== 'string') return false;

  const normalizedInput = trimHexPrefix(input);

  const isValid = /^[0-9a-fA-F]+$/.test(normalizedInput);

  if (length !== undefined) {
    return isValid && normalizedInput.length === length;
  }
  return isValid;
};

export const trimHexPrefix = (input: string): string => {
  return input.startsWith('0x') ? input.slice(2) : input;
};
