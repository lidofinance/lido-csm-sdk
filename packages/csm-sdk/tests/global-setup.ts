import { createAnvil, type Anvil } from '@viem/anvil';
import { createServer, type AddressInfo } from 'node:net';
import type { TestProject } from 'vitest/node';
import { testEnv } from './helpers/env';

declare module 'vitest' {
  export interface ProvidedContext {
    anvilRpcUrl: string;
    anvilChainId: number;
  }
}

// Cap retries on the TOCTOU window between pickFreePort()/close and
// anvil.start() bind. A busy CI runner can lose the port to another process
// in that gap; pick a fresh one and try again.
const PORT_BIND_MAX_ATTEMPTS = 5;

let anvil: Anvil | undefined;

const pickFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address() as AddressInfo;
      srv.close(() => resolve(port));
    });
  });

const isAddrInUse = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: unknown }).code === 'EADDRINUSE';

const startAnvil = async (
  forkUrl: string,
  forkBlockNumber: bigint | undefined,
  chainId: number,
): Promise<{ instance: Anvil; port: number }> => {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= PORT_BIND_MAX_ATTEMPTS; attempt++) {
    const port = await pickFreePort();
    const instance = createAnvil({
      forkUrl,
      forkBlockNumber,
      port,
      host: '127.0.0.1',
      chainId,
    });
    try {
      await instance.start();
      return { instance, port };
    } catch (err) {
      lastErr = err;
      if (!isAddrInUse(err)) throw err;
      // Port was taken between pickFreePort() and anvil bind — retry.
    }
  }
  throw lastErr;
};

export const setup = async (project: TestProject): Promise<void> => {
  const forkUrl = testEnv.forkUrl();
  const forkBlockNumber = testEnv.forkBlock();
  const chainId = testEnv.chainId();

  const { instance, port } = await startAnvil(
    forkUrl,
    forkBlockNumber,
    chainId,
  );
  anvil = instance;

  // Use Vitest's provide/inject contract instead of process.env mutation.
  // Survives pool/isolation config changes and works across all pool types.
  project.provide('anvilRpcUrl', `http://127.0.0.1:${port}`);
  project.provide('anvilChainId', chainId);
};

export const teardown = async (): Promise<void> => {
  await anvil?.stop();
};
