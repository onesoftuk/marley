# Antfarm status — Marley Moves

- Checked: 2026-02-16T14:33:00Z
- Run ID: `5e3e785d-39ef-4f36-8287-c9c8ff5798c2`
- Workflow: `feature-dev`
- Status: `running`, planner still pending (no steps claimed automatically because cron agents are blocked on the model allowlist issue).

## Current step state
- `plan`: pending
- `setup`: waiting
- `implement`: waiting
- `verify`: waiting
- `test`: waiting
- `pr`: waiting
- `review`: waiting

## Updates since last check
- Live PropertyData sold-price export now running via `src/generate_sold_exports_live.ts` (960 rows written 14:24Z).
- New feature ticket **MM-106 — API filter controls for bedrooms + price** created to capture Peter's requirement that the Antfarm task only ships with the correct filters (min bedrooms + min price) baked into the pipeline.
- Acceptance criteria for MM-106 are documented in `TASKS.md` so Antfarm agents have an explicit DoD when the workflow unblocks.

## Manual actions taken while Antfarm agents are stalled
- Refreshed `data/targeted.normalized.csv`, `data/sold-last-30-days.csv`, `data/sold-today.csv`, and `OUTPUT/data-export-summary.md` using live API data.
- Updated `OUTPUT/data-tools-status.md` with the new live run details + outstanding dependencies (postcodes provider, listings endpoint validation).

## Outstanding blockers
1. **Antfarm cron model allowlist** — agents still blocked from claiming steps until cron payloads use an allowed model (current error: `model not allowed: openai-codex/default`).
2. **Planner context** — once cron issue is fixed, rerun `feature-dev` workflow with MM-106 filter requirements included so dev step builds the filter feature end-to-end.
