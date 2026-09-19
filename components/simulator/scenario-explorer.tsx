'use client'

import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import { ArrowRight, Check, FlaskConical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Baseline, CityConfig, SimContext, SliderState } from '@/cities/types'
import { DEFAULT_OPERATIONS, LEVER_LABELS, applyOperations, compareScenario, operationLabel, readComparison, sameScenarioInputs, signed, type Comparison, type Lever } from '@/lib/scenarios'
import type { AssistantResponse } from '@/lib/ai/service'

interface Props {
  city: CityConfig
  baseline: Baseline
  sliders: SliderState
  ctx: SimContext
  comparison: Comparison | null
  onComparison: (value: Comparison | null) => void
  onApply: (sliders: SliderState, ctx: SimContext) => void
}
const FIELD = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary'
const VERDICTS = { supported: 'Supported within this model', overstated: 'Conclusion is too strong', unsupported: 'Not supported by this evidence', unclear: 'Needs clarification' }
type CheckResult = Extract<AssistantResponse, { kind: 'verdict' }>

export function ScenarioExplorer({ city, baseline, sliders, ctx, comparison, onComparison, onApply }: Props) {
  const [question, setQuestion] = useState('')
  const [claim, setClaim] = useState('')
  const [busy, setBusy] = useState<'explore' | 'check' | null>(null)
  const [notice, setNotice] = useState('')
  const [assumptions, setAssumptions] = useState<string[]>([])
  const [check, setCheck] = useState<{ signature: string; result: CheckResult } | null>(null)
  const [feedback, setFeedback] = useState(false)
  const [source, setSource] = useState<'guided' | 'jev' | 'shared'>('shared')
  const abortRef = useRef<AbortController | null>(null)
  const version = useRef(0)
  const signature = JSON.stringify({ city: city.id, sliders, ctx, comparison })
  // Cancelling also prevents a late answer from being applied to changed inputs.
  useEffect(() => {
    version.current += 1
    abortRef.current?.abort()
    return () => { version.current += 1; abortRef.current?.abort() }
  }, [signature])

  async function submit(action: 'explore' | 'check') {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const requestVersion = ++version.current
    setBusy(action); setNotice(''); setCheck(null)
    const timeout = setTimeout(() => controller.abort(), 18000)
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ action, text: action === 'explore' ? question : claim, cityId: city.id, sliders, ctx, comparison: action === 'check' ? comparison : undefined }),
      })
      const data = await response.json()
      if (requestVersion !== version.current) return
      if (!response.ok) throw new Error(data.error ?? 'Unable to interpret this question.')
      const result = data as AssistantResponse
      track('assistant_result', { city: city.id, action, outcome: result.kind })
      if (result.kind === 'comparison') {
        const clean = readComparison(result.comparison, Object.keys(city.zones), baseline.waterKm2 !== null)
        if (!clean) throw new Error('This comparison could not be validated. Try a guided example.')
        setAssumptions(result.assumptions); setFeedback(false); setSource('jev'); onComparison(clean)
        track('comparison_created', { source: 'jev', city: city.id, count: clean.scenarios.length })
      } else if (result.kind === 'clarification') setNotice(result.message)
      else if (result.kind === 'verdict') setCheck({ signature, result })
    } catch (error) {
      if (requestVersion === version.current) setNotice(controller.signal.aborted
        ? 'The request timed out. Try again or use a guided comparison.'
        : error instanceof Error ? error.message : 'The question service is unavailable.')
    } finally {
      clearTimeout(timeout)
      if (abortRef.current === controller) setBusy(null)
    }
  }
  function guided(levers: Lever[]) {
    abortRef.current?.abort(); version.current += 1
    const next: Comparison = { base: { ...sliders }, ctx: { ...ctx }, goal: 'both', scenarios: levers.map(key => [DEFAULT_OPERATIONS[key]]) }
    try {
      next.scenarios.forEach(ops => applyOperations(sliders, ops))
      setNotice(''); setCheck(null); setFeedback(false); setSource('guided')
      setAssumptions(['Example magnitudes for exploration. These do not establish feasibility or equal cost.', 'All other inputs stay fixed; linked-slider coupling is not applied.'])
      onComparison(next)
      track('comparison_created', { source: 'guided', city: city.id, count: next.scenarios.length })
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Choose different starting values.') }
  }
  const results = comparison?.scenarios.map((ops, index) => {
    const next = applyOperations(comparison.base, ops)
    return { ops, index, next, delta: compareScenario(city, baseline, comparison.base, next, comparison.ctx) }
  }) ?? []
  const atStart = comparison && sameScenarioInputs(sliders, ctx, comparison.base, comparison.ctx)
  const appliedIndex = comparison ? results.findIndex(result => sameScenarioInputs(sliders, ctx, result.next, comparison.ctx)) : -1
  const checked = check?.signature === signature ? check.result : null

  return (
    <section className="mt-8 rounded-xl border border-primary/30 bg-card/70 p-5 sm:p-6" aria-labelledby="explorer-title">
      <div className="mb-2 flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h2 id="explorer-title" tabIndex={-1} className="scroll-mt-24 text-xl font-semibold">What would help {city.name}?</h2>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">Compare explicit changes to the same starting scenario. Ask a question, or try an example without waiting for an answer.</p>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => guided(['canopyPct', 'vehiclesIndex'])}>More trees vs fewer vehicles</Button>
        <Button variant="outline" size="sm" onClick={() => guided(['canopyPct', 'builtUpPct'])}>Trees vs less built-up area</Button>
        {baseline.waterKm2 !== null && <Button variant="outline" size="sm" onClick={() => guided(['canopyPct', 'waterKm2'])}>Trees vs more water</Button>}
      </div>
      <form onSubmit={event => { event.preventDefault(); void submit('explore') }} className="space-y-2">
        <label htmlFor="scenario-question" className="text-sm font-medium">Describe your experiment</label>
        <textarea id="scenario-question" disabled={busy !== null} className={FIELD} value={question} onChange={event => setQuestion(event.target.value)} rows={2} maxLength={1200} required placeholder="Compare 5 percentage points more tree cover with 20% fewer vehicles. Keep built-up area fixed." />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs text-muted-foreground">Jev interprets your question; Taap calculates the results. Use percentage points for land-cover changes. Your submitted question and scenario are sent to TypeSafe.</p>
          <Button type="submit" disabled={busy !== null || !question.trim()}>{busy === 'explore' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Compare changes</Button>
        </div>
      </form>
      {notice && <p role="status" className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">{notice}</p>}
      {comparison && <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Your comparison · {comparison.goal === 'heat' ? 'cooling' : comparison.goal === 'air' ? 'cleaner air' : 'temperature & air quality'}</h3>
          <Button size="sm" variant="ghost" onClick={() => { onComparison(null); setAssumptions([]) }}>Clear comparison</Button>
        </div>
        <p className="text-xs text-muted-foreground">Changes below are relative to the saved starting inputs, with month {comparison.ctx.month}, {comparison.ctx.windDir} wind, AOD {comparison.ctx.aod}, {city.zones[comparison.ctx.zone]?.label}, {comparison.ctx.timeOfDay ?? 'day'} held fixed. Negative values mean lower temperature or PM2.5.</p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3 text-sm">
          <p role="status">{appliedIndex >= 0 ? `Scenario ${appliedIndex + 1} is applied to the simulator. You can switch directly to another scenario.` : atStart ? 'The simulator is showing the comparison’s starting inputs.' : 'Your inputs have changed. Applying a scenario replaces them with that card’s saved inputs and climate context.'}</p>
          {!atStart && <Button size="sm" variant="outline" onClick={() => onApply(comparison.base, comparison.ctx)}>Restore comparison start</Button>}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {(assumptions.length ? assumptions : ['Saved comparison: each card lists its exact assumptions. All other inputs stay fixed, without linked-slider coupling.']).map(text => <li key={text}>{text}</li>)}
        </ul>
        <div className="grid gap-3 md:grid-cols-2">
          {results.map(({ ops, index, next, delta }) => <article key={index} className={`rounded-lg border bg-background/60 p-4 ${appliedIndex === index ? 'border-primary ring-1 ring-primary/30' : ''}`}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Scenario {index + 1}</p>
            <h4 className="font-medium">{ops.map(operationLabel).join(' + ')}</h4>
            <p className="mt-2 text-xs text-muted-foreground">{ops.map(op => `${LEVER_LABELS[op.lever]}: ${comparison.base[op.lever]} → ${next[op.lever]}${op.lever.endsWith('Pct') ? '%' : op.lever === 'waterKm2' ? ' km²' : ''}`).join(' · ')}</p>
            <dl className="my-4 grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">Temperature change</dt><dd className="font-mono text-lg">{signed(delta.temp.value)} °C</dd><dd className="text-xs text-muted-foreground">{signed(delta.temp.low)} to {signed(delta.temp.high)} °C</dd></div>
              <div><dt className="text-xs text-muted-foreground">PM2.5 change</dt><dd className="font-mono text-lg">{signed(delta.pm25.value)} µg/m³</dd><dd className="text-xs text-muted-foreground">{signed(delta.pm25.low)} to {signed(delta.pm25.high)} µg/m³</dd></div>
            </dl>
            {ops.every(op => op.lever === 'vehiclesIndex') && <p className="mb-3 text-xs text-muted-foreground">Vehicles affect PM2.5 only in this model; AOD and temperature stay unchanged.</p>}
            <Button size="sm" variant={appliedIndex === index ? 'default' : 'outline'} aria-pressed={appliedIndex === index} onClick={() => { onApply(next, comparison.ctx); track('comparison_applied', { city: city.id, scenario: index + 1, source }) }}>{appliedIndex === index ? <><Check className="mr-2 h-3 w-3" />Scenario {index + 1} applied · View results</> : <>Apply scenario {index + 1}<ArrowRight className="ml-2 h-3 w-3" /></>}</Button>
          </article>)}
        </div>
        <p className="text-xs text-muted-foreground">Bands vary the same coefficients in both scenarios; clipping can widen them conservatively. They do not include all uncertainty. These magnitudes are not equally costly or equally feasible. Use “Copy scenario link” above to share this comparison.</p>
        {!feedback && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Did this comparison help you understand the trade-off?</span>{['Yes', 'No'].map(answer => <Button key={answer} size="sm" variant="ghost" onClick={() => { track('comparison_feedback', { helpful: answer === 'Yes', city: city.id, source }); setFeedback(true) }}>{answer}</Button>)}</div>}
      </div>}
      <div className="mt-6 border-t pt-5">
        <h3 className="mb-2 font-semibold">Does your conclusion follow?</h3>
        <form onSubmit={event => { event.preventDefault(); void submit('check') }} className="space-y-2">
          <label htmlFor="scenario-claim" className="text-xs text-muted-foreground">Check a statement against the current model results and any comparison shown above.</label>
          <textarea id="scenario-claim" disabled={busy !== null} rows={2} className={FIELD} maxLength={1200} required value={claim} onChange={event => { setClaim(event.target.value); setCheck(null) }} placeholder="Reducing vehicles will definitely cool this city." />
          <Button type="submit" variant="outline" disabled={busy !== null || !claim.trim()}>{busy === 'check' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Check conclusion</Button>
        </form>
        {checked && <div role="status" className="mt-4 rounded-lg border bg-background/60 p-4">
          <p className="font-medium">{VERDICTS[checked.verdict]}</p><p className="mt-1 text-sm text-muted-foreground">{checked.explanation}</p>
          <p className="mt-2 text-xs text-muted-foreground">This checks consistency with Taap, not the truth of the underlying scientific sources. <a className="underline" href={`/${city.id}/about`}>Model scope and sources</a>.</p>
          <details className="mt-3 text-xs"><summary className="cursor-pointer">Inspect the evidence used</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-3">{JSON.stringify(checked.evidence, null, 2)}</pre></details>
        </div>}
      </div>
    </section>
  )
}
