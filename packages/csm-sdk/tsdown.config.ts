import { transform } from 'esbuild';
import type { Plugin } from 'rolldown';
import { defineConfig } from 'tsdown';

// rolldown/oxc doesn't support TC39 Stage 3 decorator downleveling,
// only legacy experimentalDecorators. Use esbuild to transform first.
const esbuildDecorators = (): Plugin => {
  return {
    name: 'esbuild-decorators',
    async transform(code, id) {
      if (
        !/\.m?tsx?$/.test(id) ||
        id.endsWith('.d.ts') ||
        id.endsWith('.d.mts') ||
        id.includes('node_modules')
      )
        return;
      const result = await transform(code, {
        loader: 'ts',
        target: 'es2022',
        sourcemap: true,
        sourcefile: id,
      });
      return { code: result.code, map: result.map };
    },
  };
};

export default defineConfig({
  plugins: [esbuildDecorators()],
  entry: {
    index: 'src/index.ts',
    abi: 'src/abi/index.ts',
    common: 'src/common/index.ts',
    'accounting-sdk': 'src/accounting-sdk/index.ts',
    'bond-sdk': 'src/bond-sdk/index.ts',
    'core-sdk': 'src/core-sdk/index.ts',
    'deposit-data-sdk': 'src/deposit-data-sdk/index.ts',
    'deposit-queue-sdk': 'src/deposit-queue-sdk/index.ts',
    'discovery-sdk': 'src/discovery-sdk/index.ts',
    'events-sdk': 'src/events-sdk/index.ts',
    'fees-monitoring-sdk': 'src/fees-monitoring-sdk/index.ts',
    'frame-sdk': 'src/frame-sdk/index.ts',
    'ics-gate-sdk': 'src/ics-gate-sdk/index.ts',
    'keys-cache-sdk': 'src/keys-cache-sdk/index.ts',
    'keys-sdk': 'src/keys-sdk/index.ts',
    'keys-with-status-sdk': 'src/keys-with-status-sdk/index.ts',
    'module-sdk': 'src/module-sdk/index.ts',
    'operator-sdk': 'src/operator-sdk/index.ts',
    'parameters-sdk': 'src/parameters-sdk/index.ts',
    'permissionless-gate-sdk': 'src/permissionless-gate-sdk/index.ts',
    'rewards-sdk': 'src/rewards-sdk/index.ts',
    'roles-sdk': 'src/roles-sdk/index.ts',
    'stealing-sdk': 'src/stealing-sdk/index.ts',
    'strikes-sdk': 'src/strikes-sdk/index.ts',
    'tx-sdk': 'src/tx-sdk/index.ts',
    'curated-gate-sdk': 'src/curated-gate-sdk/index.ts',
    'curated-gates-collection-sdk': 'src/curated-gates-collection-sdk/index.ts',
    'meta-registry-sdk': 'src/meta-registry-sdk/index.ts',
  },
  format: ['esm', 'cjs'],
  unbundle: true,
  dts: { sourcemap: true },
  target: 'es2022',
  exports: {
    customExports(pkg) {
      for (const [key, value] of Object.entries(pkg)) {
        if (typeof value !== 'object' || !value) continue;
        const { import: esm, require: cjs } = value as Record<string, string>;
        if (esm && cjs) {
          pkg[key] = {
            import: { types: esm.replace('.mjs', '.d.mts'), default: esm },
            require: { types: cjs.replace('.cjs', '.d.cts'), default: cjs },
          };
        }
      }
      pkg['./package.json'] = './package.json';
      return pkg;
    },
  },
  clean: true,
  sourcemap: true,
  report: false,
  logLevel: 'warn',
});
