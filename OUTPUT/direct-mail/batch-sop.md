# Direct Mail Batch Process SOP

**Purpose:** Weekly direct-mail campaign workflow  
**Owner:** Operations team  
**Frequency:** Every Monday morning  
**Target volume:** 50-200 letters per batch (adjust based on budget & capacity)

---

## Workflow Overview

```
Weekly Pull → Dedupe → Merge → Print → Post → Track
```

---

## Step 1: Weekly Data Pull

**When:** Monday 09:00  
**Owner:** Data team / automated script

### Actions:

1. Run PropertyData SSTC fetch script:
   ```bash
   npm run fetch:sstc
   ```

2. Export new SSTC properties from the past 7 days:
   - Filter: `date_sold >= (today - 7 days)`
   - Filter: `postcode starts with SP8` (or configured target area)
   - Filter: `bedrooms >= 2` (or configured minimum)
   - Filter: `price >= £200,000` (or configured minimum)

3. Save output as CSV:
   ```
   data/sstc-batch-YYYY-MM-DD.csv
   ```

**Expected output columns:**
- `property_id`
- `owner_name`
- `property_address`
- `sale_price`
- `date_sold`

---

## Step 2: Dedupe

**When:** Monday 09:30  
**Owner:** Operations team

### Actions:

1. Load current batch CSV
2. Load historical contact log:
   ```
   data/contact-history.csv
   ```

3. Remove duplicates:
   - Match on `property_address` (exact match)
   - Remove any property already contacted in the past 6 months
   - Remove any property on the suppression list (opt-outs)

4. Save deduplicated batch:
   ```
   data/sstc-batch-YYYY-MM-DD-deduped.csv
   ```

5. Log removed records to:
   ```
   data/dedupe-log-YYYY-MM-DD.csv
   ```

**Acceptance criteria:**
- No duplicate addresses in output
- Deduped count logged for tracking

---

## Step 3: Merge (Mail Merge)

**When:** Monday 10:00  
**Owner:** Operations team

### Actions:

1. Generate unique reference codes:
   - Format: `MM-YYYYMMDD-XXXX` (e.g., `MM-20260216-0001`)
   - Sequential numbering per batch

2. Merge data into letter template:
   - Use `OUTPUT/direct-mail/letter-template.md` as base
   - Replace merge variables:
     - `{{OWNER_NAME}}`
     - `{{PROPERTY_ADDRESS}}`
     - `{{SALE_PRICE}}`
     - `{{DATE_SOLD}}`
     - `{{REF_CODE}}`

3. Generate QR codes:
   - URL format: `https://marleymoves.co.uk?ref={{REF_CODE}}`
   - Embed QR code image in letter

4. Export merged letters as PDF:
   ```
   OUTPUT/direct-mail/batch-YYYY-MM-DD/letter-{{REF_CODE}}.pdf
   ```

5. Generate batch manifest:
   ```
   OUTPUT/direct-mail/batch-YYYY-MM-DD/manifest.csv
   ```
   - Columns: `ref_code`, `owner_name`, `property_address`, `mail_date`, `status`

**Acceptance criteria:**
- All merge variables populated (no `{{XXX}}` placeholders remain)
- QR codes valid and scannable
- PDFs print-ready (A4, correct margins)

---

## Step 4: Print

**When:** Monday 14:00  
**Owner:** Operations team or print vendor

### Actions:

1. **Option A: In-house printing**
   - Load PDFs into printer queue
   - Print on 100gsm bond paper
   - Inspect first 3 letters for quality

2. **Option B: Print vendor**
   - Upload batch PDF folder to vendor portal
   - Confirm print specifications:
     - Paper: 100gsm white/cream
     - Envelope: DL windowed
     - Postage: 2nd class
   - Approve proof if required

3. Fold and envelope letters:
   - Ensure address visible through window
   - Include any inserts (flyers, business cards)

**Acceptance criteria:**
- All letters printed and enveloped
- Address visible and legible
- No print errors (smudges, misalignment)

---

## Step 5: Post

**When:** Monday 16:00 (or Tuesday 09:00 if vendor handles posting)  
**Owner:** Operations team or print vendor

### Actions:

1. Deliver batch to Royal Mail or post office:
   - Use bulk mail service if volume > 100 letters
   - Request proof of posting receipt

2. Update batch manifest:
   - Set `status = posted`
   - Record `post_date`

3. Save receipt/tracking docs:
   ```
   OUTPUT/direct-mail/batch-YYYY-MM-DD/proof-of-posting.pdf
   ```

**Expected delivery:**
- 2nd class: 2-3 working days
- Letters should arrive by Thursday/Friday

---

## Step 6: Track Responses

**When:** Ongoing (daily check)  
**Owner:** Sales/support team

### Actions:

1. Monitor response channels:
   - **Phone calls** — log ref code from caller
   - **Website visits** — track `?ref=MM-YYYYMMDD-XXXX` parameter
   - **QR code scans** — log scan events in analytics

2. Update CRM:
   - Match ref code to property/owner record
   - Set stage = `responded` or `interested`
   - Schedule follow-up call/email

3. Weekly response report:
   ```
   OUTPUT/direct-mail/batch-YYYY-MM-DD/response-report.csv
   ```
   - Columns: `ref_code`, `response_date`, `response_channel`, `outcome`, `notes`

**Key metrics:**
- Response rate = (responses / letters sent) * 100
- Conversion rate = (leads / responses) * 100
- Cost per lead = (batch cost / leads)

---

## Contingency Plans

### Data pull fails
- **Fallback:** Use previous week’s data (mark as retry batch)
- **Escalation:** Contact data vendor support

### Print vendor unavailable
- **Fallback:** Use backup in-house printer or alternative vendor
- **Timeline:** Allow +2 days for backup printing

### Low volume week (< 20 properties)
- **Decision:** Skip batch or combine with next week
- **Threshold:** Minimum 20 letters per batch for cost-efficiency

---

## Checklist Summary

- [ ] Monday 09:00 — Run data pull
- [ ] Monday 09:30 — Dedupe against history
- [ ] Monday 10:00 — Merge letters + generate QR codes
- [ ] Monday 14:00 — Print and envelope
- [ ] Monday 16:00 — Post batch
- [ ] Daily — Track responses and update CRM
- [ ] Friday 17:00 — Weekly response report
