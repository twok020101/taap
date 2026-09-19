# Jev integration

The explorer turns a submitted question into a bounded set of changes. Every result remains a preview until the user applies it. The conclusion checker evaluates a statement against recomputed model outputs and implementation limitations, not against independently verified scientific truth.

## Request path

`ScenarioExplorer` submits text, city, current slider/context values and optionally a comparison to `POST /api/assistant`. The server validates the request, loads its own city baseline, and recomputes evidence. It never trusts client-supplied outputs, coefficients or citations.

Jev selects goals, scope, whether levers are mentioned, and bounded operations. Numeric candidates are parsed in code and selected semantically; absent or ambiguous quantities get an explicit example or clarification. Canopy/built-up changes distinguish percentage points, relative percentages and absolute targets. A narrow, tested grammar handles explicit `compare X with/versus Y` commands without an extra judgment. Mixed or bundled wording is judged separately. Unused speculative quantity judgments do not block an omitted lever.

The pinned SDK is `@typesafe-ai/sdk@0.6.0`; the default model is `jev-1.13.0`. Model and question-version changes invalidate the in-process cache and require reevaluation. `TYPESAFE_MODEL` can override the model server-side. API key lookup is exclusively from `TYPESAFE_API_KEY`.

All questions for one state are batched. Calls happen on submission, never per slider movement. Each request has a 12-second provider timeout and no automatic retry, a 16 KB HTTP body limit and a 1,200-character question limit. The browser abandons pending answers when the scenario changes. A ten-minute cache holds at most 100 entries and deduplicates identical in-flight calls per process. Server logs contain action, outcome, model, tokens and timing, never question text or keys.

The 30-request/minute circuit breaker is per server process. For public deployment, configure the hosting firewall's shared rate limits and TypeSafe account spending controls; process memory is not a distributed quota. The API returns safe failures, and guided comparisons require no provider access.

## Model and UI behavior

- Population is read-only contextual data. No demographic cooling coefficient was invented.
- Mumbai's missing water baseline stays `null`. Water-change contributions are omitted from both model and map, the control explains the missing evidence, and proposed water interventions are rejected. Geographic water features remain part of the illustrative map.
- Every comparison shares its starting inputs and climate context. Listed changes apply atomically in free mode, preserving held levers rather than invoking linked-slider coupling.
- Applying a card brings the current simulation and readouts summary into view. The active card is marked, and users can switch directly between alternatives or restore the saved start. Applying after manual edits replaces those edits with the card’s saved inputs and context.
- Temperature and PM2.5 effects are computed as paired differences. The same coefficient realization is used in both runs; endpoint combinations cancel unchanged-driver uncertainty. When output clamps are encountered, conservative interval subtraction covers possible interior extrema. These bands cover selected coefficient ranges only.
- Shared URLs contain the starting inputs, context and bounded operations. Reload validates them, preserves numeric precision and marks custom scenarios correctly. Prompts, conclusions and provider credentials are not serialized into URLs.
- Source and methodology links resolve to the selected city's page. Its evidence audit labels unresolved claims explicitly.

## Evidence audit

`pnpm audit:evidence` derives four current coefficient claims from `model/coefficients.ts` and reads source descriptors from `data/evidence/sources.json`. Each descriptor supplies an HTTPS URL, local UTF-8 passage path, and section locator. Optional quotes are checked by normalized string matching before any semantic call. Source passages must be at most 60,000 characters; extraction must be intentional, not silently truncated.

Missing source files produce `unverified` without inference. Supplied passages are classified as supporting, conflicting, insufficient, or needing review. Typed output and high model confidence do not certify science. Report entries include exact claim, source hash, locator, model and audit time. The methodology page marks a coefficient changed since the report as needing a new audit.

The initial audit inspected the abstract/main text of Ziter et al. 2019 from [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6462107/). Its source passage is stored locally under ignored `.cache/evidence/ziter-2019.txt`; it is not redistributed in the repository. The canopy claim needs review, including geographic applicability and its numeric derivation. The other three coefficient entries lack inspected source text. This does not claim those studies are false; it records the evidence available to this audit.

```bash
pnpm audit:evidence --sources=data/evidence/sources.json --output=data/evidence/audit.json
# Fails when any inspected coefficient lacks support; useful as a deliberate release gate:
pnpm audit:evidence --strict
```

Rerunning on a fresh checkout without local passages will correctly report missing evidence. A maintainer supplies the relevant full passage and locator before rerunning; a citation title alone is insufficient. This workflow does not cover all city baselines, climate offsets, map features or other numerical claims.

## Validation and impact

`pnpm test` covers constraint preservation, omitted branches, numeric semantics, paired uncertainty/clipping, missing water, URL round-trips, invalid inputs, missing keys and provider failures. `pnpm eval:jev` sends labeled fixtures to the real API, checks resolved application behavior and writes `.cache/jev-evaluation.json` with latency and token usage. An out-of-scope assertion may be rejected or sent for review; it must never receive a supported badge. An abstention on a clear actionable request is counted as a failure, not hidden as a successful interpretation. Confidence gates are conservative preview rules, not globally calibrated accuracy claims.

The existing Vercel Analytics integration records `comparison_created`, `comparison_applied`, `comparison_feedback`, `assistant_result` and `scenario_shared`. Guided, Jev and shared origins are distinguished for application/feedback events. No prompt text is included in these custom events. Compare adoption and usefulness between guided and Jev flows, and conduct a small comprehension study: can users identify which scenario changed PM2.5 versus temperature and distinguish illustration from prediction? Feedback and conversion metrics are proxies, not proof of learning. This implementation does not claim a measured product-impact improvement before user data exists.

### Local verification snapshot

On 2026-09-20 IST, 23 automated tests passed and the 14-case live Jev evaluation passed all expected behavior checks (including rejection or review for an out-of-scope guarantee). The live run used 39,532 input tokens, with median observed latency 396 ms and p95 1,403 ms on this machine. These small fixtures are regression evidence, not production accuracy or latency guarantees. Earlier iterations exposed compare-versus-combine ambiguity and omitted-lever uncertainty; explicit comparison grammar and separate mention checks address those cases without lowering the main confidence gate.
