import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { evidenceClaims, evidenceQuestions, quotePresent, resolveEvidence } from '../lib/ai/evidence'
import { evaluate } from '../lib/ai/service'

interface Source { url: string; textFile: string; locator: string; quote?: string }
async function main() {
  const args = process.argv.slice(2)
  const sourcePath = args.find(a => a.startsWith('--sources='))?.slice(10) ?? 'data/evidence/sources.json'
  const output = args.find(a => a.startsWith('--output='))?.slice(9) ?? 'data/evidence/audit.json'
  const strict = args.includes('--strict')
  const sources = JSON.parse(await readFile(resolve(sourcePath), 'utf8')) as Record<string, Source>
  const rows = []
  for (const item of evidenceClaims()) {
    const source = sources[item.id]
    let passage = ''
    if (source?.textFile) {
      try { passage = await readFile(resolve(source.textFile), 'utf8') } catch { /* Missing source is explicitly unverified. */ }
    }
    const row = { ...item, status: 'unverified', sourceUrl: source?.url ?? null, locator: source?.locator ?? null, sourceHash: null as string | null, model: null as string | null, inputTokens: 0, note: 'Source text missing. A citation label alone cannot verify a coefficient.' }
    if (passage.trim()) {
      if (!source?.url?.startsWith('https://') || !source.locator) throw new Error(`Provide an HTTPS source URL and section locator for ${item.id}.`)
      if (passage.length > 60_000) throw new Error(`${item.id}: source exceeds 60,000 characters. Supply a focused passage with its section locator; do not truncate silently.`)
      row.sourceHash = createHash('sha256').update(passage).digest('hex')
      if (source.quote && !quotePresent(passage, source.quote)) {
        row.status = 'quote_missing'; row.note = 'The specified quote was not found in the supplied passage. Check the quote and source extraction.'
      } else {
        const { result, meta } = await evaluate({ claim: item.claim, source: { title: item.source, url: source.url, locator: source.locator, passage } }, evidenceQuestions)
        row.status = resolveEvidence(result.answers); row.model = meta.model; row.inputTokens = meta.inputTokens
        row.note = 'Automated passage check only. A maintainer must review source applicability and coefficient derivation before treating this as scientific validation.'
      }
    }
    rows.push(row)
  }
  const report = { checkedAt: new Date().toISOString(), scope: 'Four intervention coefficients. This is a source-passage audit, not validation of the full simulator or all city data.', rows }
  await mkdir(dirname(resolve(output)), { recursive: true })
  await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ output, statuses: rows.map(({ id, status }) => ({ id, status })), inputTokens: rows.reduce((sum, r) => sum + r.inputTokens, 0) }, null, 2))
  if (strict && rows.some(row => row.status !== 'supports')) process.exitCode = 1
}
main().catch(() => { console.error('Evidence audit failed. Check source files, passage sizes, and TypeSafe configuration; no provider error details were logged.'); process.exitCode = 1 })
