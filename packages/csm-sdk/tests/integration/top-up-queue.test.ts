import { describe, expect, it } from 'vitest';
import { useCsm02Sdk } from '../helpers';

describe('integration: top-up queue (read-only, CSM 0x02)', () => {
  it('getTopUpQueueInfo returns enabled === true on CSM 0x02 hoodi', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();
    expect(info.enabled).toBe(true);
  });

  it('getTopUpQueueKeys returns one entry per queued key, positions contiguous and ascending', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();
    const keys = await sdk.depositQueue.getTopUpQueueKeys();

    expect(keys.length).toBe(Number(info.length));
    keys.forEach((entry, i) => expect(entry.position).toBe(i));
  });

  it('getTopUpQueueSize matches getTopUpQueueInfo().length', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();
    const size = await sdk.depositQueue.getTopUpQueueSize();

    expect(size).toBe(Number(info.length));
  });

  it('getOperatorTopUpQueue returns a snapshot consistent with getTopUpQueueSize', async () => {
    const sdk = useCsm02Sdk();
    const operatorId = 0n;

    const [{ total, keys }, size, info] = await Promise.all([
      sdk.depositQueue.getOperatorTopUpQueue(operatorId),
      sdk.depositQueue.getTopUpQueueSize(),
      sdk.operator.getInfo(operatorId),
    ]);

    expect(total).toBe(size);

    keys.forEach((key) => {
      expect(key.position).toBeLessThan(total);
      expect(key.index).toBeLessThan(info.totalAddedKeys);
    });

    const positions = keys.map((key) => key.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('paginates with an offset, positions starting at the offset', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();
    // Not enough queued keys on this fork to exercise offset 1 — skip rather than fail.
    if (info.length < 3n) return;

    const page = await sdk.depositQueue.getTopUpQueueKeys({
      offset: 1n,
      limit: 2n,
    });

    expect(page[0]?.position).toBe(1);
  });

  // The hoodi fork's discovery proxy predates the getTopUpQueueItems selector,
  // so these exercise the legacy fallback — expected until the upgrade lands.
  it('getTopUpQueueItems returns a full snapshot consistent with getTopUpQueueInfo', async () => {
    const sdk = useCsm02Sdk();
    const [info, snapshot] = await Promise.all([
      sdk.depositQueue.getTopUpQueueInfo(),
      sdk.depositQueue.getTopUpQueueItems(),
    ]);

    expect(snapshot.length).toBe(info.length);
    expect(snapshot.enabled).toBe(info.enabled);
    expect(snapshot.items.length).toBe(Number(info.length));

    snapshot.items.forEach((item, i) => {
      expect(item.position).toBe(i);
      expect(item.keyIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it('getTopUpQueueItems paginates with an offset, positions starting at the offset', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();
    if (info.length < 3n) return;

    const page = await sdk.depositQueue.getTopUpQueueItems({
      offset: 1n,
      limit: 2n,
    });

    expect(page.items[0]?.position).toBe(1);
    expect(page.items.length).toBeLessThanOrEqual(2);
  });

  it('getTopUpQueueItems returns an empty item list once offset reaches the queue length', async () => {
    const sdk = useCsm02Sdk();
    const info = await sdk.depositQueue.getTopUpQueueInfo();

    const snapshot = await sdk.depositQueue.getTopUpQueueItems({
      offset: info.length,
      limit: 10n,
    });

    expect(snapshot.items).toEqual([]);
    expect(snapshot.length).toBe(info.length);
  });
});
