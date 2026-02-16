# Direct Mail Tracking Schema

**Purpose:** Define tracking codes, response channels, and CRM stage progression for direct-mail campaigns  
**Owner:** Operations + Sales teams  
**Version:** 1.0

---

## 1. Reference Code Format

### Structure

```
MM-YYYYMMDD-XXXX
```

- **MM** — Marley Moves prefix (fixed)
- **YYYYMMDD** — Batch date (e.g., 20260216 for Feb 16, 2026)
- **XXXX** — Sequential number within batch (0001-9999)

### Examples

- `MM-20260216-0001` — First letter in Feb 16, 2026 batch
- `MM-20260216-0150` — 150th letter in same batch
- `MM-20260223-0001` — First letter in Feb 23, 2026 batch

### Properties

- **Uniqueness:** Globally unique across all campaigns
- **Human-readable:** Easy to read over the phone
- **Sortable:** Chronological sorting by batch date
- **Length:** 15 characters (fits on letter footer, QR URL, CRM field)

---

## 2. Response Channels

### Channel Definitions

We track responses through **four primary channels**:

| Channel | Method | Tracking Mechanism | Priority |
|---------|--------|-------------------|----------|
| **Phone** | Inbound call to [Phone Number] | Caller quotes ref code | High |
| **QR Code** | Mobile scan of QR code on letter | URL parameter `?ref=MM-YYYYMMDD-XXXX` | High |
| **Website** | Direct URL visit | URL parameter `?ref=MM-YYYYMMDD-XXXX` | Medium |
| **Email** | Email to contact address | Sender mentions ref code or property address | Low |

### Channel Implementation

#### Phone

- **Number:** [Main Contact Number]
- **Greeting script:** “Thank you for calling Marley Moves. Do you have a reference code from your letter?”
- **Logging:** Support agent enters ref code into CRM
- **Fallback:** If no ref code, ask for property address and match manually

#### QR Code

- **URL format:** `https://marleymoves.co.uk/contact?ref=MM-YYYYMMDD-XXXX`
- **Landing page:** Dedicated contact form with ref code pre-populated
- **Analytics:** Track scan events in Google Analytics (event: `qr_scan`, parameter: `ref_code`)
- **Conversion:** Form submission logs ref code in CRM

#### Website Direct

- **URL format:** `https://marleymoves.co.uk?ref=MM-YYYYMMDD-XXXX`
- **Tracking:** UTM parameters + ref code in URL
- **Session:** Ref code stored in session cookie for attribution
- **Forms:** All contact forms capture ref code if present

#### Email

- **Address:** peter@onesoft.co.uk (or dedicated campaign address)
- **Subject line prompt:** “Please include your reference code (MM-XXXXXXXX-XXXX)”
- **Parsing:** Manual or automated (regex: `MM-\d{8}-\d{4}`)
- **Logging:** Support agent enters ref code into CRM

---

## 3. CRM Stage Progression

### Stage Definitions

Each contact moves through a **linear stage progression** from initial mail to closed outcome.

| Stage | Definition | Trigger | Owner | Next Action |
|-------|-----------|---------|-------|-------------|
| **1. Mailed** | Letter posted | Batch posted | Ops | Wait for response (7-14 days) |
| **2. Responded** | Contact received via any channel | Phone/QR/web/email response | Sales | Qualify lead |
| **3. Qualified** | Valid lead (genuine interest + fit) | Sales rep confirms intent | Sales | Schedule consultation |
| **4. Consultation** | Initial meeting/call booked | Calendar invite sent | Sales | Conduct consultation |
| **5. Proposal** | Service proposal sent | Quote/proposal delivered | Sales | Follow up in 2-3 days |
| **6. Won** | Client agreed to use service | Contract signed / deposit paid | Sales | Handover to delivery team |
| **7. Lost** | Client declined or unresponsive | 3 follow-ups with no engagement | Sales | Archive (can re-engage in 6 months) |
| **8. Opted Out** | Requested removal from future mail | Explicit opt-out request | Ops | Add to suppression list |

### Stage Transition Rules

- **Mailed → Responded:** Automatic when response logged
- **Responded → Qualified:** Manual (sales rep assesses)
- **Qualified → Consultation:** Manual (sales rep books meeting)
- **Consultation → Proposal:** Manual (sales rep sends quote)
- **Proposal → Won:** Manual (contract signed)
- **Proposal → Lost:** Manual (after 3 follow-ups)
- **Any stage → Opted Out:** Manual (immediate)

### Stage Metrics

- **Response rate** = (Responded / Mailed) * 100
- **Qualification rate** = (Qualified / Responded) * 100
- **Conversion rate** = (Won / Mailed) * 100
- **Average time to win** = Days from Mailed to Won

---

## 4. Data Schema (CSV/Database)

### Contact Record Fields

```csv
ref_code,property_id,owner_name,property_address,sale_price,date_sold,mail_date,stage,response_date,response_channel,qualified_date,consultation_date,proposal_date,outcome_date,outcome,notes
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ref_code` | String | Yes | Unique tracking code (MM-YYYYMMDD-XXXX) |
| `property_id` | String | Yes | Internal property ID from data source |
| `owner_name` | String | Yes | Property owner full name |
| `property_address` | String | Yes | Full property address |
| `sale_price` | Integer | Yes | Sale price in GBP (e.g., 450000) |
| `date_sold` | Date | Yes | SSTC or completion date (YYYY-MM-DD) |
| `mail_date` | Date | Yes | Date letter posted (YYYY-MM-DD) |
| `stage` | Enum | Yes | Current CRM stage (see stage definitions) |
| `response_date` | Date | No | Date of first response (YYYY-MM-DD) |
| `response_channel` | Enum | No | Channel: phone, qr, web, email |
| `qualified_date` | Date | No | Date lead qualified (YYYY-MM-DD) |
| `consultation_date` | Date | No | Date of consultation (YYYY-MM-DD) |
| `proposal_date` | Date | No | Date proposal sent (YYYY-MM-DD) |
| `outcome_date` | Date | No | Date of final outcome (YYYY-MM-DD) |
| `outcome` | Enum | No | Final result: won, lost, opted_out |
| `notes` | Text | No | Free-text notes from sales team |

### Example Record

```csv
MM-20260216-0042,PROP-12345,"John Smith","12 High Street, Gillingham, SP8 4AA",425000,2026-02-10,2026-02-16,qualified,2026-02-19,qr,2026-02-20,2026-02-25,,,"Interested in removals + solicitor referral"
```

---

## 5. Reporting & Analytics

### Weekly Batch Report

**File:** `OUTPUT/direct-mail/batch-YYYY-MM-DD/weekly-report.csv`

**Contents:**
- Total letters mailed
- Total responses
- Response rate (%)
- Breakdown by channel
- Qualified leads count
- Conversion to consultation (%)
- Cost per response

### Campaign Dashboard

**Key Metrics (rolling 30 days):**
- Total letters sent
- Total responses
- Average response time (days)
- Response rate by postcode
- Conversion rate by property price band
- ROI (revenue / campaign cost)

**Tools:**
- Google Sheets or Excel for basic tracking
- CRM reports (HubSpot, Pipedrive, etc.) for advanced analytics
- Google Analytics for web/QR tracking

---

## 6. Privacy & Compliance

### GDPR Considerations

- **Lawful basis:** Legitimate interest (property sales are public record)
- **Opt-out:** Provide clear opt-out instructions in every letter
- **Suppression list:** Maintain list of opted-out addresses (never contact again)
- **Data retention:** Delete contact data after 12 months if no engagement

### Opt-Out Process

1. **Letter footer:** Include “To opt out of future mailings, email optout@marleymoves.co.uk with your ref code.”
2. **Logging:** Add opted-out ref codes to suppression list:
   ```
   data/suppression-list.csv
   ```
3. **Deduplication:** Always check suppression list before mailing new batch

---

## 7. Implementation Checklist

- [ ] Set up ref code generation script
- [ ] Create QR code generator (URL + ref code)
- [ ] Configure website landing page with ref code capture
- [ ] Set up Google Analytics event tracking for QR scans
- [ ] Create CRM fields for stage tracking
- [ ] Train support/sales team on ref code logging
- [ ] Set up weekly batch report automation
- [ ] Create suppression list CSV
- [ ] Document opt-out process for team
