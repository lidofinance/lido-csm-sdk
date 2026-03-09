import { Address, isAddressEqual } from 'viem';
import { fetchJson } from '../common/utils/fetch-json.js';
import { ModuleOperatorsResponse, ModulesResponse } from './types.js';

const fetchModules = async (
  keysApiLink: string,
): Promise<ModulesResponse['data']> => {
  const response = await fetchJson<ModulesResponse>(
    `${keysApiLink}/v1/modules`,
  ).catch(() => ({ data: [] }));

  return response.data;
};

const fetchOperators = async (
  keysApiLink: string,
  moduleId: number,
): Promise<ModuleOperatorsResponse['data']['operators']> => {
  const response = await fetchJson<ModuleOperatorsResponse>(
    `${keysApiLink}/v1/modules/${moduleId}/operators`,
  ).catch(() => ({ data: { operators: [] } }));

  return response.data.operators;
};

export const findUsedOtherModule = async (
  keysApiLink: string | undefined,
  moduleId: bigint,
  address: Address,
): Promise<string | null> => {
  if (!keysApiLink) return null;

  const modules = await fetchModules(keysApiLink);

  const results = await Promise.all(
    modules.map(({ id }) =>
      BigInt(id) === moduleId ? undefined : fetchOperators(keysApiLink, id),
    ),
  );
  const operators = results.flat().filter((o) => !!o);

  const matchedOperator = operators.find((o) =>
    isAddressEqual(o.rewardAddress as Address, address),
  );
  const matchedModule =
    matchedOperator &&
    modules.find((m) =>
      isAddressEqual(
        m.stakingModuleAddress as Address,
        matchedOperator.moduleAddress as Address,
      ),
    );

  return matchedModule?.name ?? null;
};
