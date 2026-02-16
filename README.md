# marley-moves

Type: **external**

## Quick start

~~~bash
npm install
npm test
npm run dev
~~~

## Scripts
- `npm test` — run tests (Vitest)
- `npm run dev` — run src/index.ts via tsx

## Dashboard
Run `npm run dev dashboard` (default command) to start the local dashboard server. By default it listens on `http://127.0.0.1:4177` (override via `DASHBOARD_PORT` or `--port`).

### Working with local CSV exports
1. Generate exports with the existing data scripts (e.g. `src/generate_sold_exports.ts`) so that `data/sold-today.csv` and `data/sold-last-30-days.csv` exist on disk. The dashboard never calls external APIs — it only reads these files.
2. Start the dashboard server via `npm run dev dashboard` (append `--port <number>` to override the listener).
3. Visit `http://127.0.0.1:4177/` in a browser to view the metric cards and tables sourced from the CSV files.
4. Whenever you re-run the export scripts or replace the CSVs, press the **Refresh data** button in the UI (or send `POST /dashboard/refresh`) to force the dashboard to re-read the filesystem before re-rendering.

Routes:
- `GET /` — renders the dashboard UI with metric cards, tables, and refresh control.
- `GET /dashboard` — returns the latest metrics/tables (cached until refreshed).
- `POST /dashboard/refresh` — re-reads `data/sold-today.csv` and `data/sold-last-30-days.csv` from disk and returns the updated view (UI refresh button triggers this).

### Regression checklist (Ticket B1)
Follow this whenever you touch the dashboard so we keep API integrations untouched:
1. `npm test` — runs Vitest suites covering dashboard data, UI, HTTP endpoints, and propertydata fallbacks.
2. `npm run build` — TypeScript compile to ensure type safety for the CLI + dashboard server.
3. `npm run dev dashboard -- --port 4177` — start the local-only server, open `http://127.0.0.1:4177/`, and press **Refresh data** after swapping CSV exports.
4. Confirm the tables and metric cards reflect only the filesystem data (no outbound requests show up in the terminal logs).
5. Re-run the propertydata export script (or the regression tests) whenever API-facing code changes to make sure we still persist CSV output without mutating the API entrypoint.

Documenting the checklist here keeps the regression scope visible to dev + QA and gives the verifier a single place to confirm how we run the dashboard locally.

## Output
Deliverables and generated artifacts go in `OUTPUT/`.
