# PropertyData -> Normalized Field Mapping (MVP)

This mapping reflects the fallback-safe normalization implemented in `src/propertydata_mvp.ts`.

| Normalized field | Source field(s) checked (in order) | Notes |
|---|---|---|
| `source` | constant: `propertydata` | Hardcoded source tag for lineage |
| `listing_id` | `id`, `listing_id`, `listingId`, `uid`, `reference` | Falls back to `unknown` |
| `address_line_1` | `address_line_1`, `address1`, `street`, `address` | First non-empty string |
| `address_line_2` | `address_line_2`, `address2`, `locality` | Optional |
| `postcode` | `postcode`, `postal_code`, `zip` | Optional but expected |
| `town` | `town`, `city`, `area` | Optional but expected |
| `listing_status` | `listing_status`, `status` | Falls back to `unknown` |
| `status_changed_at` | `status_changed_at`, `statusUpdatedAt`, `updated_at` | ISO datetime preferred |
| `first_seen_at` | `first_seen_at`, `firstSeenAt`, `created_at` | ISO datetime preferred |
| `asking_price` | `asking_price`, `price`, `list_price` | Number coercion with symbol stripping |
| `bedrooms` | `bedrooms`, `beds` | Number coercion |
| `property_type` | `property_type`, `type` | Falls back to `unknown` |
| `source_url` | `source_url`, `url`, `listing_url` | Canonical listing URL |
| `ingest_ts` | runtime timestamp (`new Date().toISOString()`) | Set at ingestion time |

## Response container mapping

The fetch layer currently accepts rows from the first array found in:

1. `listings`
2. `data`
3. `results`

This is intentionally simple and reversible for MVP.
