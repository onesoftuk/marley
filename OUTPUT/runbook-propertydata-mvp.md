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

Optional custom endpoint override:

```bash
export PROPERTYDATA_API_URL="https://api.propertydata.co.uk/v1/listings"
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
