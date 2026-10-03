# Taap — implementation status

Updated for the accuracy-first engineering demo, October 2026. This replaces earlier project-status notes whose historical-validation, Monte Carlo, April-2026 snapshot and coefficient-calibration descriptions did not match the evidence or implementation.

## Implemented scope

- Four-city stories and a research library distinguish published mechanisms from numerical model assumptions.
- Deterministic scenarios, guided comparisons and optional server-side Jev interpretation/checking.
- Versioned, validated URL state; comparison application, share/reopen and history handling.
- Explicit mixed-year reference inputs, demonstration coefficient status and clipping diagnostics. Historical examples are sensitivity diagnostics, not PASS/FAIL scientific validation.
- Generated map patterns labelled illustrative, with a friendly unavailable-map summary.
- Guided demo before advanced controls; direct simulator links avoid the timed introduction.
- Engineering case study and per-city methodology navigation.

## Verification

Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, then the browser workflow in `tests/e2e/`. Exact outcomes are commit-specific and reported in the pull request. The tests do not measure predictive validity. Selected coefficient endpoints use deterministic interval propagation, not Monte Carlo sampling.

## Remaining limits

No held-out scientific validation, matched air/LST observational calibration, general performance benchmark, or street-level measurement model. Some reference inputs and coefficient derivations remain unverified. Live feeds and AI depend on external service availability. Mumbai water-area evidence is missing and remains unavailable.

See [engineering details](engineering.md) and [AI integration](jev-integration.md).
