import { Capabilities, ChainIdToCapabilities } from 'viem';

const isSupported = (capability?: {
  supported?: boolean;
  status?: 'supported' | 'ready' | 'unsupported';
}) => {
  if (!capability) return false;

  if (typeof capability.status === 'string') {
    return capability.status === 'supported';
  }

  return !!capability.supported;
};

export const isCapabilitySupported = (
  caps: ChainIdToCapabilities<Capabilities, number>,
  chainId: number,
  capName: keyof Capabilities,
) => {
  const capabilities = caps[0] || caps[chainId];
  return isSupported(capabilities?.[capName]);
};
