import { DepositData } from '../types.js';

const MAX_JSON_LENGTH = 1048576; // 1MB

export const normalizeHexInJson = (text: string) => text.replace(/"0x/gm, '"');

export const parseJson = (data: string) => {
  if (!data) {
    throw new Error('deposit data should not be empty');
  }
  if (data.length > MAX_JSON_LENGTH) {
    throw new Error('deposit data is too big (max 1MB)');
  }
  let depositData: DepositData[];
  try {
    const parsed = data ? JSON.parse(data) : undefined;
    depositData = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error('invalid json format');
  }
  depositData.forEach((item) => {
    if (typeof item !== 'object') {
      throw new Error('it should be an array of a objects');
    }
  });
  if (depositData.length === 0) {
    throw new Error(`Should have at least 1 key`);
  }
  return depositData;
};
