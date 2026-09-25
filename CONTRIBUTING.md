# Contributing to Claude Coach

Thanks for your interest in Claude Coach! This is a small, independent side project maintained in spare time, so a little context on how issues and pull requests are handled should help set expectations.

## How issues and pull requests are triaged

- New issues and pull requests are looked at on a best-effort basis, usually within a week or two. If something has been sitting longer than that without a response, a friendly bump on the thread is welcome.
- Issues get labeled by **type** (`bug`, `enhancement`, `question`, `documentation`) and by **area** (for example `exports` for workout export formats like `.zwo`, `.fit`, or `.mrc`, and `strava` for anything about syncing activities).
- `needs-info` means the issue is waiting on more detail from the person who opened it. Issues that stay in `needs-info` for a month or so without a reply may be closed; they can always be reopened.
- `good first issue` and `help wanted` mark things where a pull request would be especially welcome.
- Not every feature request will be accepted. The goal is to keep the skill small and focused on generating and exporting training plans, so larger integrations may be declined or left open for discussion.

## Reporting an issue

A good bug report includes:

- Where you ran the skill (Claude.ai or Claude Code) and which release of `coach-skill.zip` you used
- If you ran the `claude-coach` CLI directly, its npm version, your Node.js version, and your OS
- What you asked Claude to do, what you expected, and what happened instead
- For export problems, the format (`.ics`, `.zwo`, `.fit`, `.mrc`) and the app or device that rejected the file

Please **do not** paste Strava client secrets, access tokens, or your personal activity data into an issue. If a problem only reproduces with your data, describe its shape instead (sport, rough volume, date range).

## Pull requests

- Keep pull requests small and focused on one change. For anything larger than a bug fix or a small export tweak (a new integration, a new data source, a schema change), please open an issue first so we can agree on the approach before you invest the time.
- Set up with `npm install`. The database tests shell out to the `sqlite3` CLI, so have it on your `PATH` (`brew install sqlite3` / `apt install sqlite3`). Then make sure these pass before you push:

  ```bash
  npm run typecheck
  npm run test:run
  npm run format:check
  ```

- Add or update tests under `tests/` when you change behavior in `src/`.
- If you change anything under `skill/`, run `npm run build:skill` and load the resulting `dist/coach-skill.zip` in Claude to make sure the skill still works end to end.
- Don't bump the version in `package.json`; releases are cut separately (see `RELEASING.md`).

## Security

If you find a security problem, please avoid posting full exploit details in a public issue. Open an issue with a short, general description (or email the maintainer at the address in `package.json`) and we'll follow up from there.
