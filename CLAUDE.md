# Claude Coach

AI-powered training plan generator for endurance athletes (triathlon, marathon, ultra-running). Uses Claude AI to create personalized plans with optional Strava integration.

## Quick Commands

```bash
npm run build          # Full build (TypeScript + Svelte viewer + skill zip)
npm run build:ts       # Compile TypeScript only
npm run build:viewer   # Build Svelte viewer to templates/plan-viewer.html
npm test               # Run tests in watch mode
npm run test:run       # Run tests once (CI)
npm run typecheck      # TypeScript type checking
npm run format         # Format with Prettier
npm run dev            # Run CLI with tsx watch
npm run dev:viewer     # Start Vite dev server for viewer
```

## Architecture

```
src/
├── cli.ts              # Main CLI (argument parsing, commands)
├── lib/                # Config and logging utilities
├── db/                 # SQLite database (client, schema, migrations)
├── schema/             # TypeScript types for training plans
├── strava/             # Strava API client and OAuth
└── viewer/             # Svelte SPA for plan display/editing
    ├── components/     # Svelte UI components
    ├── lib/export/     # Export handlers (ICS, ZWO, FIT, ERG)
    └── stores/         # Svelte stores (plan, settings, changes)
```

## Key Conventions

- **Strict TypeScript**: No `any` types, all compiler flags enabled
- **ES Modules**: `"type": "module"` throughout, ESM imports
- **Svelte 5**: Uses runes for reactive state
- **Testing**: Vitest with globals enabled (no explicit imports needed)
- **Formatting**: Prettier with double quotes, semicolons, 2-space tabs

## Data Storage

- Config: `~/.claude-coach/config.json`
- Tokens: `~/.claude-coach/tokens.json`
- Database: `~/.claude-coach/coach.db` (SQLite)

## Testing

Tests are in `tests/` directory, mirroring `src/` structure:
- `tests/cli/` - CLI argument parsing, config, database, Strava API
- `tests/viewer/` - Export formats, utilities, plan validation

Run specific tests: `npm test -- path/to/test.test.ts`

## Export Formats

The viewer supports exporting workouts to:
- **ICS** - Calendar apps (RFC 5545)
- **ZWO** - Zwift workouts
- **FIT** - Garmin devices (uses @garmin/fitsdk)
- **ERG** - TrainerRoad/TrainerDay

## Pre-commit Hooks

Husky runs on commit:
1. `npm run typecheck` - Must pass type checking
2. `npx lint-staged` - Prettier formats staged files
