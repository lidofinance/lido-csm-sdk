import { describe, expect, it, vi } from 'vitest';
import { readAllPages } from '../../../src/common/utils/read-all-pages';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';

const BLOCK = 77n;

const setup = () => {
  const publicClient = { getBlockNumber: vi.fn(async () => BLOCK) };
  const slice = (offset: bigint, limit: bigint, total: bigint) => {
    const end = offset + limit < total ? offset + limit : total;
    const items: bigint[] = [];
    for (let i = offset; i < end; i++) items.push(i);
    return items;
  };
  return { publicClient, slice };
};

describe('readAllPages', () => {
  it('pins count and every page to one block and walks offsets', async () => {
    const { publicClient, slice } = setup();
    const count = vi.fn(async (_block: bigint) => 2500n);
    const readPage = vi.fn(async ({ offset, limit }) => ({
      items: slice(offset, limit, 2500n),
    }));

    const result = await readAllPages({ publicClient, count, readPage });

    expect(publicClient.getBlockNumber).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith(BLOCK);
    expect(readPage.mock.calls.map(([a]) => a)).toEqual([
      { offset: 0n, limit: 1000n, blockNumber: BLOCK },
      { offset: 1000n, limit: 1000n, blockNumber: BLOCK },
      { offset: 2000n, limit: 1000n, blockNumber: BLOCK },
    ]);
    expect(result).toHaveLength(2500);
  });

  it('uses a supplied block without fetching one', async () => {
    const { publicClient } = setup();
    const readPage = vi.fn(async () => ({ items: [1n], total: 1n }));

    await readAllPages({ publicClient, blockNumber: 5n, readPage });

    expect(publicClient.getBlockNumber).not.toHaveBeenCalled();
    expect(readPage).toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 5n }),
    );
  });

  it('takes the total from the page when no count is given', async () => {
    const { publicClient, slice } = setup();
    const readPage = vi.fn(async ({ offset, limit }) => ({
      items: slice(offset, limit, 30n),
      total: 30n,
    }));

    const result = await readAllPages({ publicClient, limit: 10n, readPage });

    expect(readPage).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(30);
  });

  it('follows a cursor until next returns undefined', async () => {
    const { publicClient } = setup();
    const next = new Map([
      [0n, 4n],
      [4n, 9n],
    ]);
    const readPage = vi.fn(async ({ offset }) => ({ items: [offset] }));

    const result = await readAllPages({
      publicClient,
      readPage,
      next: (_page, { offset }) => next.get(offset),
    });

    expect(result).toEqual([0n, 4n, 9n]);
  });

  it.each([0n, -1n, 1001n])(
    'rejects limit %s before any read',
    async (limit) => {
      const { publicClient } = setup();
      const readPage = vi.fn();

      await expect(
        readAllPages({ publicClient, limit, readPage }),
      ).rejects.toMatchObject({ code: ERROR_CODE.INVALID_ARGUMENT });
      expect(readPage).not.toHaveBeenCalled();
      expect(publicClient.getBlockNumber).not.toHaveBeenCalled();
    },
  );

  it('propagates an error on a later page and discards partial results', async () => {
    const { publicClient } = setup();
    const boom = new Error('page 2 failed');
    const readPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1n] })
      .mockRejectedValueOnce(boom);

    await expect(
      readAllPages({ publicClient, count: async () => 3000n, readPage }),
    ).rejects.toBe(boom);
  });
});
