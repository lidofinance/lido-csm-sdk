export const isDefined = <T>(value: T | undefined | void): value is T => {
  return value !== undefined;
};

export const isUnique = <T>(value: T, index: number, array: T[]) => {
  return array.indexOf(value) === index;
};

export const isNotUnique = <T>(value: T, index: number, array: T[]) => {
  return array.indexOf(value) !== index;
};

export const isPropsDefined = <T, K extends keyof T>(...props: K[]) => {
  return (obj: T): obj is T & Record<K, NonNullable<T[K]>> => {
    return props.every((prop) => obj[prop] !== undefined && obj[prop] !== null);
  };
};
