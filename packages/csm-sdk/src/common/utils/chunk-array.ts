import { invariantArgument } from './sdk-error';

export const chunkArray = <T>(items: T[], size: number): T[][] => {
  invariantArgument(
    Number.isInteger(size) && size > 0,
    'chunk size must be a positive integer',
  );

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};
