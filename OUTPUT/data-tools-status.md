# Marley Moves — Data Tools Status (updated 2026-02-16 14:24 GMT)

## Built and running

1. **PropertyData sold-price export (live)**
   - Script: `src/generate_sold_exports_live.ts`
   - Latest run: 2026-02-16T14:24:08.993Z
   - Output rows: 960 across SP8 / SP7 / SP3
   - Last-30-days window currently empty because PropertyData feed only includes records through Dec 2025 for these outcodes; monitoring on next pull.
   - Files refreshed automatically:
     - `data/targeted.normalized.csv`
     - `data/sold-last-30-days.csv`
     - `data/sold-today.csv`
     - `OUTPUT/data-export-summary.md`

2. **PropertyData ingestion MVP (listings endpoint)**
   - Script: `src/propertydata_mvp.ts`
   - Behaves live when `PROPERTYDATA_API_KEY` is present; keeps mock fallback for tests.

3. **SP8 radius postcode extraction tool (v1)**
   - Script: `src/sp8_radius_postcodes.ts`
   - Current output:
     - `data/sp8-radius-20mi-postcodes.csv`
     - `OUTPUT/sp8-radius-20mi-summary.md`

## Remaining limitations

- **Postcode coverage cap:** `postcodes.io` radius endpoint still limited to ~100 entries; need a paid provider (Ideal Postcodes, GetAddress, etc.) to guarantee the full 20-mile list.
- **Listings endpoint validation:** need to re-run `propertydata_mvp.ts` with live API access once PropertyData confirms listings API path + quota. Currently tested via sold-prices endpoint above.

## Credentials on file

- `PROPERTYDATA_API_KEY` — configured in `.env`.
- Pending for radius coverage: one of `IDEALPOSTCODES_API_KEY`, `GETADDRESS_API_KEY`, or other bulk postcode dataset access.

## Next actions

1. **Listings ingestion live test** — confirm PropertyData listings endpoint + filters, capture first live CSV for SSTC feed.
2. **Full postcode provider** — integrate Ideal Postcodes (recommended) to remove radius cap.
3. **Batch SOP** — document end-to-end weekly pull → dedupe → letter export now that live data is flowing.