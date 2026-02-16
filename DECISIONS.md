# DECISIONS — marley-moves

## Initial decisions (M1)

### Paths
- Workspace root: /Users/popstack/OpenClaw/workspaces/external/marley-moves
- Output folder: /Users/popstack/OpenClaw/workspaces/external/marley-moves/OUTPUT
- Data folder: /Users/popstack/OpenClaw/workspaces/external/marley-moves/data

### Storage choice
- [ ] JSON files per entry
- [ ] Single JSONL append-only log
- [ ] SQLite (later)

Decision: TBD
Rationale: Keep M1 local-first and dependency-light.

### Integration points (later)
- OpenClaw memory_search integration
- Agent context pack generation
- Optional embeddings provider

## Change log
- 2026-02-15: Initialized workspace scaffold (node-ts-vitest).
- 2026-02-16: Data-source decision for lead-gen kickoff: use PropertyData API as immediate MVP source; run parallel enterprise procurement (WhenFresh/PriceHubble, TwentyEA, REalyse, Sprift) for SSTC-depth upgrade path.
