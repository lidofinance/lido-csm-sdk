import { describe, expect, it } from 'vitest';
import type { MethodAccess } from '../../src/common/decorators/access-types';
import { accessMapFromPrototype, MODULES } from './sdk-modules';

// Snapshot pins the @Access surface across all SDK modules.
// Any add/remove/change shows up as a snapshot diff in review.
// Refresh deliberately via `yarn test -u` after intentional contract changes.

describe('SDK @Access coverage', () => {
  it('annotated methods across all SDK modules match snapshot', () => {
    const map: Record<string, Record<string, MethodAccess>> = {};
    for (const [name, ModuleClass] of Object.entries(MODULES)) {
      const access = accessMapFromPrototype(ModuleClass);
      if (Object.keys(access).length > 0) map[name] = access;
    }
    expect(map).toMatchSnapshot();
  });
});
