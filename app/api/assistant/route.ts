import { NextResponse } from 'next/server'
import { AssistantError, readAssistantRequest, runAssistant } from '@/lib/ai/service'

export const runtime = 'nodejs'
export const maxDuration = 20
const MAX_BODY = 16_000
let windowStart = 0, requestCount = 0

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new AssistantError('Use the assistant from this site.', 403)
    if (!request.headers.get('content-type')?.includes('application/json')) throw new AssistantError('Send a JSON request.', 415)
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) throw new AssistantError('This question is too large.', 413)
    const reader = request.body?.getReader()
    if (!reader) throw new AssistantError('Enter a question.')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_BODY) { await reader.cancel(); throw new AssistantError('This question is too large.', 413) }
      chunks.push(chunk.value)
    }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new AssistantError('The request is not valid JSON.') }
    const parsed = readAssistantRequest(body)
    // A local circuit breaker; deployments should also set an account spend cap
    // and a Vercel firewall rate limit, since serverless instances do not share RAM.
    if (Date.now() - windowStart >= 60_000) { windowStart = Date.now(); requestCount = 0 }
    if (++requestCount > 30) throw new AssistantError('Too many questions. Try again in a minute; guided comparisons still work.', 429)
    const result = await runAssistant(parsed)
    console.info('taap_assistant', { action: parsed.action, outcome: result.kind, ...result.meta })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const known = error instanceof AssistantError
    // Do not expose SDK exceptions, headers, request text, or credentials.
    return NextResponse.json({ error: known ? error.message : 'The question service did not respond. Try again or use a guided comparison.' }, {
      status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store' },
    })
  }
}
