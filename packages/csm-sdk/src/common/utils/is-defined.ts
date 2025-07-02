export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};

export const isUnique = <T>(value: T, index: number, array: T[]) => {
  return array.indexOf(value) === index;
};

export const isNotUnique = <T>(value: T, index: number, array: T[]) => {
  return array.indexOf(value) !== index;
};
