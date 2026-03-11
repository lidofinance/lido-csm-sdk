# CSM SDK Package

See root [CLAUDE.md](../../CLAUDE.md) for full architecture, patterns, and conventions.

## Package Commands

- `yarn build` - Full build (clean + CJS, ESM, types)
- `yarn test` - Run Vitest tests
- `yarn lint` - ESLint with max 0 warnings
- `yarn types` - Type checking without emitting
- `yarn clean` - Remove dist directory

## Development Workflow

After changes: `yarn build && yalc push` to update dependent projects.
