# Engineering Taap

Taap is an engineering demonstration and educational exploration, not a calibrated environmental forecast. [Live demo](https://taap.thetwok.in/bangalore/simulator) · [Source](https://github.com/twok020101/taap) · [On-site case study](https://taap.thetwok.in/engineering).

## Architecture

- `cities/`, `data/`, `lib/baselines.ts`: typed city configuration, reference inputs and provenance. Input vintages differ; a scenario year is not proof of a simultaneous observation.
- `model/`: deterministic scalar and synthetic spatial response functions. Output magnitudes and ranges depend on demonstration assumptions. The grid is generated from zones/features, not satellite-derived measurements.
- `lib/scenarios.ts`: bounded scenario specifications, held constraints, paired comparisons and conclusion evidence. Population is contextual. Missing Mumbai water remains unavailable rather than zero.
- `components/simulator/`: controlled state, guided exploration, advanced inputs and versioned share URLs. Hash decoding validates incoming state; exact state serialization supports reproducibility and browser history.
- `lib/ai/`, `app/api/assistant/`: server-only optional Jev integration. AI interprets requests and assesses claims against deterministic evidence; it does not author simulation numbers. Bounded requests and errors preserve the non-AI path.
- App Router server-rendered stories/research pages and client interactions; MapLibre feature-state updates avoid rebuilding geometry for each slider move. The unavailable-map state exposes a readable synthetic summary.

## Deliberate tradeoffs

A small transparent linear demonstration is easier to inspect than an unexplained predictive claim. Research supports mechanisms; it does not establish these exact coefficients or their applicability to India. Temperature-equivalent response is explicitly distinct from measured near-surface air temperature, land-surface temperature and human heat exposure.

Reference-relative context makes unchanged reference inputs produce zero headline delta. Paired comparisons hold climate context fixed. The synthetic map includes assumed local patterns, excludes uniform climate terms and is not required to average to the headline result. Basemap satellite pixels do not validate the overlay.

Sensitivity endpoints are deterministic interval propagation, not Monte Carlo or statistical confidence intervals. Clamps are display/model guardrails, not evidence of calibration. Saturation is disclosed; matching an unverified historical target is not a validation test.

## Reproduce the software checks

Use the lockfile and a supported Node.js version for Next.js 16 (Node 20.9+):

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm start
```

Browser verification instructions and executable test script are in `tests/e2e/`. They exercise desktop/mobile flows, guided comparison/application, control/reset, sharing/reopen, history, source navigation and a non-WebGL fallback. AI online evaluation is separate: `pnpm eval:jev` requires an authorized server-side `TYPESAFE_API_KEY`; absence of that key must not block the guided demo. Never put secrets in `NEXT_PUBLIC_` variables.

## Evidence required before predictive claims

A future scientific model needs compatible measured metrics, geography and dates; traceable parameter derivations; matched calibration and held-out observations; and a published error protocol. No forecast accuracy, performance benchmark or validated Indian-city coefficients are claimed here. Passing software tests establishes implementation behavior only.
