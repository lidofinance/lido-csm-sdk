import { DepositData } from '../types.js';
import { normalizeHexInJson, parseJson } from './parse-json.js';

export const parseDepositData = (
  jsonDepositData: string,
): { error?: string; depositData: DepositData[] } => {
  try {
    const depositData = parseJson(normalizeHexInJson(jsonDepositData));

    return { depositData };
  } catch (error) {
    return { error: (error as Error).message, depositData: [] };
  }
};
