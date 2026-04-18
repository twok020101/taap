# Project: Bangalore Urban Heat Simulator

An interactive web app explaining why Bangalore has become hotter, with sliders that modify tree canopy, built-up area, water bodies, vehicles, and population and show the modelled effect on temperature and AQI.

## Agent delegation — ALWAYS use subagents

Always delegate work to subagents via the Agent tool instead of doing it in the main context. This keeps the main thread lean and protects it from tool-result bloat, which matters for a multi-week build with a lot of data plumbing.

Pick the model by task complexity — err on using a smaller model when the task is well-scoped:

### Haiku (`model: "haiku"`)
Use for **fast, narrow, mechanical** tasks:
- Single-file reads or greps when you already know roughly what you're looking for
- Formatting changes, rename-across-file, small typed edits
- Running a specific script and summarising the output
- Pulling a JSON value from an API response
- Listing files, checking git status, one-shot verifications
- Anything under 3 tool calls where the outcome is deterministic

### Sonnet (`model: "sonnet"`) — default choice
Use for **standard feature work** and most day-to-day coding:
- Implementing a component against a clear spec
- Adding a new API route / data-source fetcher following an existing pattern
- Writing a slider + readout wiring, connecting UI to the model layer
- Multi-file edits with 3–10 tool calls
- Straightforward bug fixes where the repro is known
- Writing tests for existing code

### Opus (`model: "opus"`)
Reserve for **genuinely hard** work:
- Architecture / design decisions ("how should the model layer be structured?")
- Debugging where the cause is unknown and requires hypothesis-building
- Cross-cutting refactors touching 10+ files
- Research-heavy synthesis (reading papers, reconciling conflicting sources)
- Anything where the first instinct is "this needs a second pair of eyes"

### How to call

```
Agent({
  subagent_type: "general-purpose",   // or "Explore" for read-only codebase search
  model: "haiku" | "sonnet" | "opus",
  description: "3-5 word summary",
  prompt: "Self-contained brief with file paths, goals, constraints, expected output format"
})
```

Prompts must be self-contained — the subagent has zero memory of this conversation, so include file paths, line numbers, and acceptance criteria. Delegate understanding never: don't write "based on your findings, fix the bug" — synthesise findings in the main thread and hand the subagent a concrete instruction.

**Run in parallel** when tasks are independent — send multiple Agent tool calls in one message.

## Project conventions

- Package manager: **pnpm**.
- Framework: **Next.js 16** App Router, TypeScript strict, React Server Components by default.
- Styling: **Tailwind v4** + **shadcn/ui**.
- Map: **MapLibre GL** (no Mapbox token).
- Deploy target: **Vercel**.
- No database, no auth in v1.
- Data sources cached via ISR (`revalidate` per source, never hammer upstream).
- Slider coefficients live in `model/coefficients.ts` — every value must cite a peer-reviewed source in a comment.
- City-level config lives in `cities/<name>.ts` — adding a city must never require a refactor.

## Branch & commit workflow

- `/setup` runs on new work (creates `docs/<branch>.md`).
- `/cmit` handles commits and PR creation.
- Branch docs are gitignored (per `/cmit` convention).

## Model honesty non-negotiables

The slider simulator is illustrative, not predictive. The UI must surface:
1. Uncertainty bands (low/central/high) on every readout.
2. Citations on hover for every coefficient.
3. A permanent "what this does NOT include" panel — advection, monsoon, aerosols, scale caveat.

Shipping without the honesty panel is a blocker, not a polish item.
