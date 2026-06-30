# CSM SDK Package

See root [CLAUDE.md](../../CLAUDE.md) for full architecture, patterns, and conventions.

## Package Commands

- `yarn build` - Full build (clean + CJS, ESM, types)
- `yarn test` - Run unit Vitest tests (fast, no chain)
- `yarn test:integration` - Run anvil-backed integration tests (needs `.env`)
- `yarn test:all` - Run both projects
- `yarn lint` - ESLint with max 0 warnings
- `yarn types` - Type checking without emitting
- `yarn clean` - Remove dist directory

## Testing

Two Vitest projects share one config:

- `unit` — `tests/unit/**/*.test.ts`, no chain, runs on every PR (incl. forks).
- `integration` — `tests/integration/**/*.test.ts`, anvil fork of hoodi by default,
  runs only on internal PRs (CI gates on `head.repo.full_name == github.repository`).

Helpers in `tests/helpers/` follow a cached `use*()` fixture pattern. See
[`tests/README.md`](./tests/README.md) for the full guide.

## Development Workflow

After changes: `yarn build && yalc push` to update dependent projects.
