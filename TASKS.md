# TASKS — marley-moves

> Ticket format: M1-XXX. Each ticket has a small, testable DoD.

## M1-001 — Project skeleton + storage layout
**DoD**
- Storage folder convention decided (see DECISIONS.md)
- Minimal types/interfaces for entries
- Tests cover basic read/write roundtrip

## M1-002 — CRUD CLI
**DoD**
- CLI supports create/read/update/delete/list
- `npm run dev` can be used for quick manual runs
- Tests cover at least create + read

## M1-003 — Search (v1)
**DoD**
- Search by substring across title/body/tags
- Tests cover at least 3 entries with deterministic results

---

## MM-101 — Ideas log + prioritisation board
**DoD**
- `IDEAS.md` created with status lanes: Now / Next / Parked
- Current idea set captured (Agent Zero, 5 Ways to Make Money, AI Avatars, Marley Moves data strategy)
- Each idea has owner, value hypothesis, and next action

## MM-102 — PropertyData MVP connector (near-real-time listings)
**DoD**
- Define required fields for Marley Moves workflow (including status/lifecycle fields)
- Build first pass fetch + normalise script with sample output in `OUTPUT/`
- Add run instructions and env var template

## MM-103 — SSTC vendor procurement pack
**DoD**
- Outreach list finalised (WhenFresh/PriceHubble, TwentyEA, REalyse, Sprift)
- Outreach message finalised + stored in `OUTPUT/vendor-outreach/`
- Comparison sheet template with pricing/licensing/SLA columns

## MM-104 — Direct-mail operations starter kit
**DoD**
- Letter template v1 + merge variables
- Batch process SOP (weekly pull -> dedupe -> merge -> print/post)
- Tracking schema (ref code + response channel + CRM stage)

## MM-105 — 14-day launch sprint plan
**DoD**
- Timeline by day with owner per task
- Daily success metrics + end-of-day decision gates
- Blockers + fallback path documented

## MM-106 — API filter controls for bedrooms + price ✅
**DoD**
- Capture user-configurable filters for minimum bedrooms (1–5) and minimum price in `.env` + runbooks
- Update PropertyData sold-price and listings scripts to enforce those filters before writing CSVs
- Reflect active filters in `OUTPUT/data-export-summary.md` and SOP so Antfarm agents have clear acceptance criteria
