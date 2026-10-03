'use client'

import { Check, Link2 } from 'lucide-react'

export function ShareScenarioButton({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  return <button type="button" onClick={onCopy}
    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card/60 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
    aria-label="Copy a shareable link to this exact simulator scenario">
    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
    {copied ? 'Link copied' : 'Copy scenario link'}
  </button>
}
