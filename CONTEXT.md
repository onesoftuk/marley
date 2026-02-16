# CONTEXT — marley-moves

## Goal
- Lead generation system for recently-sold properties
- Outbound letter workflow + tracking
- Compliance + operational playbook

## M1 scope (ship first)
- Local-first memory store (filesystem-backed)
- CRUD operations + basic search
- CLI for manual testing

## Constraints
- Must run locally on macOS (Node.js).
- No external services required for M1.
- Keep it simple: single package, TypeScript, Vitest.

## Definition of Done (M1)
- `npm test` passes
- CLI can: create/read/update/delete/list entries
- Basic search works across stored entries
- Docs updated: TASKS.md + DECISIONS.md
