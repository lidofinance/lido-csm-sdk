import { transform } from 'esbuild';
import type { Plugin } from 'rolldown';

// rolldown/oxc doesn't support TC39 Stage 3 decorator downleveling,
// only legacy experimentalDecorators. Use esbuild to transform first.
export const esbuildDecorators = (): Plugin => {
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
