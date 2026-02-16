# Marley Moves — Sold Property Lead Gen + Letter Outreach (V1)

[PROJECT: marley-moves]
[ROOT: /Users/popstack/OpenClaw/workspaces/external/marley-moves]
[OUTPUT: /Users/popstack/OpenClaw/workspaces/external/marley-moves/OUTPUT]

## Objective
Build a repeatable system to identify **recently sold / SSTC** properties and send a **physical introduction letter** quickly, then track inbound responses + conversions.

## Constraints / Assumptions (initial)
- We may **not** have phone/email; assume **postal address only**.
- Data access from portals (Rightmove/Zoopla) is limited; we should plan for **multiple sources**.
- Must remain compliant (UK GDPR/PECR + direct mail best practices).

## End-to-end process (target state)
1) Detect sold/SSTC listings within target area(s)
2) Extract postal address + basic property metadata
3) Deduplicate + enrich (optional)
4) Generate letters (template + variable fields)
5) Print + post at scale (batching)
6) Track responses (unique code/URL/phone)
7) CRM pipeline: Lead → Quote → Booked → Completed
8) Measure ROI per source/area/time window

## V1 (lowest-cost)
- Manual weekly lead pull (CSV) + Mail Merge + batch send.
- Tracking via a unique ref code per letter batch + spreadsheet CRM.

## Next artifacts to produce
- 1-page “Morning brief” (bullets)
- Letter template(s) + offer structure
- Data schema (CSV columns) + dedupe rules
- Recommended tooling for print/post + CRM

> Research agent report will be merged in here.

## Decision update (2026-02-16)
- Primary data path: **PropertyData API** for immediate MVP execution.
- Parallel procurement: **WhenFresh/PriceHubble, TwentyEA, REalyse, Sprift** for enterprise SSTC-grade feed options.
- Decision gate: end-of-day vendor/licensing/commercial check determines stay-with-PropertyData vs enterprise upgrade.

## Execution timeline (kickoff)

### T+0 to T+4 hours (today)
1. Finalise field requirements + status transition assumptions.
2. Create PropertyData MVP pull/normalise script and produce first sample batch.
3. Send same-day quote/licensing outreach to all enterprise vendors.
4. Prepare v1 direct-mail template + tracking code format.

### T+1 day
1. Validate sample quality for target postcodes (coverage + duplicate rates + lifecycle usefulness).
2. Create dedupe and batch-selection rules.
3. Build vendor comparison sheet (price, SLA, licensing, latency).
4. Draft weekly operational SOP (pull -> clean -> letter -> post -> track).

### T+2 to T+3 days
1. Run first pilot batch generation from real inputs.
2. QA address formatting + print-ready exports.
3. Finalise CRM stages and response logging protocol.
4. Confirm legal/compliance checks for direct-mail use.

### T+4 to T+7 days
1. Execute first live mailing batch.
2. Track inbound responses and classify quality.
3. Tune targeting criteria by early response data.
4. Make supplier decision (continue PropertyData-only vs hybrid/enterprise feed).

### Week 2
1. Scale batch size and cadence.
2. Add automation for routine steps (ingest/dedupe/export).
3. Publish KPI dashboard in `OUTPUT/` (response rate, qualified leads, quote rate, CPA proxy).

## Owner lanes (agent-aligned)
- **main:** orchestration, decision gates, risk and priority control
- **research:** vendor pricing/licensing/SLA procurement + compliance notes
- **dev:** connector scripts, normalisation, dedupe/export pipeline
- **seo:** geo/area prioritisation framework for highest-intent zones
- **social:** messaging variants and trust-language testing for letter copy
- **clip:** optional short-form explainer asset for offer communication
