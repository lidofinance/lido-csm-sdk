import { parseJson } from './parse-json.js';

export const removeKey = (jsonDepositData: string, index: number) => {
  try {
    const parsed = parseJson(jsonDepositData);
    parsed.splice(index, 1);
    return parsed.length > 0 ? JSON.stringify(parsed) : '';
  } catch {
    return '';
  }
};
