# Marley Moves — Geo-Priority Framework (Direct Mail)

## 1) Scoring factors (postcode sector level)
Use postcode sectors (e.g., SW18 1, M21 8) as the base unit.

Score each factor 0–100, then apply weights.

1. **Transaction Volume Proxy (weight 30%)**
   - Proxy: last 12 months sales count (or listings if sales not available)
   - Why: more turnover = bigger reachable seller pool
   - Scoring bands:
     - Top 20% sectors by volume = 100
     - 60–80th percentile = 75
     - 40–60th percentile = 50
     - 20–40th percentile = 25
     - Bottom 20% = 10

2. **Property Value Band Fit (weight 20%)**
   - Proxy: median sold price (12-month rolling)
   - Why: targets sectors aligned with Marley Moves’ profitable fee range
   - Scoring method:
     - Define ideal value band (example: £275k–£650k; adjust to business economics)
     - In-band = 100
     - 15% outside band = 70
     - 30% outside band = 40
     - >30% outside band = 15

3. **Likely Seller Intent Proxy (weight 25%)**
   - Composite proxy (choose available signals):
     - New listings growth (8 weeks vs prior 8 weeks)
     - Price reductions per 100 listings
     - Time-on-market above local baseline
   - Why: indicates owners likely to respond to direct-mail proposition
   - Scoring:
     - Standardize each signal to 0–100, then average into intent score

4. **Competition Risk (inverse) (weight 15%)**
   - Proxy: competitor density / mail saturation (agents advertising heavily, leaflet frequency, paid search share if available)
   - Why: lower saturation improves response efficiency
   - Scoring:
     - Low competition = 100
     - Medium = 60
     - High = 20

5. **Travel/Logistics Efficiency (weight 10%)**
   - Proxy: average drive time from team base + clustering adjacency
   - Why: supports valuations, viewings, and operational speed
   - Scoring bands:
     - ≤20 min average = 100
     - 21–35 min = 70
     - 36–50 min = 40
     - >50 min = 15

---

## 2) Scoring formula (0–100)

For each postcode sector:

**Priority Score =**
`0.30*Volume + 0.20*ValueFit + 0.25*SellerIntent + 0.15*CompetitionInverse + 0.10*Logistics`

Where each component is already normalized to 0–100.

Output:
- **80–100:** Tier A (immediate targeting)
- **65–79:** Tier B (secondary wave)
- **50–64:** Tier C (test only)
- **<50:** Hold

---

## 3) Weekly review process (30–45 mins)

1. **Refresh data (Monday AM)**
   - Update latest listings, reductions, sales counts, drive-time assumptions.
2. **Recalculate scores**
   - Run the weighted formula for all sectors in catchment.
3. **Apply movement flags**
   - Flag sectors with score change ±10+ points week-on-week.
4. **Check campaign performance overlay**
   - Add response rate, valuation bookings, cost per lead (if mail already dropped).
   - Penalize sectors with poor conversion after 2 consecutive drops.
5. **Finalize mail plan**
   - Keep Tier A sectors; rotate in top-rising Tier B sectors.
6. **Log decisions**
   - Record what changed and why (short note per sector).

Guardrails:
- Don’t drop a sector after one weak week; require 2-week underperformance.
- Don’t scale a new sector beyond pilot volume until first conversion signal appears.

---

## 4) Choosing first 3 postcode clusters for pilot

Use this rule set:

1. Rank all sectors by Priority Score.
2. Filter to sectors with:
   - Score ≥75
   - Logistics score ≥70
   - Competition score ≥50
3. Build contiguous clusters (adjacent sectors) to reduce ops friction.
4. Select top **3 clusters** using tie-breakers in order:
   - Higher Seller Intent score
   - Better logistics
   - Greater transaction volume
5. Allocate pilot mail volume:
   - Cluster 1: 40%
   - Cluster 2: 35%
   - Cluster 3: 25%
6. Pilot duration: 4 weeks, then re-rank with real response/conversion data.

Practical size guide:
- 3–6 sectors per cluster
- Enough addresses per cluster to sustain at least 2 mail touches in pilot window

---

## Data minimum needed
- Sales/listing count by postcode sector (12m + recent 8w trend)
- Median property value by sector
- Listing velocity signals (reductions, days on market, relistings if available)
- Competition indicator by sector
- Drive time from operating base

If data quality is uneven, keep weights the same but use confidence flags and avoid over-scaling low-confidence sectors.