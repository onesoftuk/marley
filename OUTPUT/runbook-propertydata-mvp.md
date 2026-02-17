# PropertyData MVP Runbook (Marley Moves)

This runbook is copy-paste ready for local execution.

## 1) Move to project root

```bash
cd /Users/popstack/OpenClaw/workspaces/external/marley-moves
```

## 2) Install dependencies (if needed)

```bash
npm install
```

## 3) Run tests (must stay passing)

```bash
npm test
```

## 4) (Optional) Build TypeScript

```bash
npm run build
```

## 5) Configure API credentials (live mode)

Set the API key in your shell (do **not** commit secrets):

```bash
export PROPERTYDATA_API_KEY="<your_propertydata_api_key>"
```

Provide at least one list + postcode target (comma-separated list when passing multiple):

```bash
export PROPERTYDATA_LIST_ID="<propertydata_list_id>" # e.g. repossessed-properties
export PROPERTYDATA_DEFAULT_POSTCODES="SP8 4AA, SP7 8AA"
export PROPERTYDATA_RADIUS_MILES=15
export PROPERTYDATA_MAX_AGE_DAYS=30
export PROPERTYDATA_MAX_RESULTS=50
export PROPERTYDATA_EXCLUDE_SSTC=0
```

Optional custom endpoint override (defaults to sourced-properties):

```bash
export PROPERTYDATA_API_URL="https://api.propertydata.co.uk/sourced-properties"
```

## 6) Run MVP ingestion scaffold

```bash
npx tsx src/propertydata_mvp.ts
```

Expected output file:

```bash
data/sample.normalized.csv
```

## 7) Verify output shape

```bash
head -n 5 data/sample.normalized.csv
```

Expected header columns:

```text
source,listing_id,address_line_1,address_line_2,postcode,town,listing_status,status_changed_at,first_seen_at,asking_price,bedrooms,property_type,source_url,ingest_ts
```

---

## Behavior notes

- If `PROPERTYDATA_API_KEY` is missing or live API call fails, the script **falls back to 3 mock rows**.
- This keeps the scaffold runnable for MVP demos and downstream integration tests.
- No secrets are stored in repository files.
