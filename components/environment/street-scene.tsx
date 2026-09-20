'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, Droplets, Sun, TreePine } from 'lucide-react'

const states = [
  { name: 'Sealed & exposed', caption: 'Sunlight lands on roofs and roads. Less shade. More heat stored in hard surfaces.', shade: 'Little shelter from direct sun', heat: 'Exposed surfaces store solar heat', water: 'Sealed ground limits infiltration', trees: 1, colour: '#c8744c' },
  { name: 'Room for shade', caption: 'Trees interrupt the sun’s path. Shade changes the experience of the same street.', shade: 'More routes sheltered by canopy', heat: 'Shaded ground receives less sunlight', water: 'Planting beds make room for soil', trees: 4, colour: '#ab9f64' },
  { name: 'Connected nature', caption: 'Shade, living soil and space for water work together. Local climate still shapes the result.', shade: 'Connected canopy along the street', heat: 'Shade and evaporation support cooling', water: 'Rain gardens create infiltration space', trees: 7, colour: '#82b898' },
]

/** Conceptual illustration: no synthetic temperatures or quantitative ecosystem scores. */
export function StreetScene() {
  const [step, setStep] = useState(0)
  const id = useId().replace(/:/g, '')
  const state = states[step]
  return <section aria-labelledby="street-title" className="overflow-hidden rounded-2xl border border-border bg-card/30">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-7">
      <div><p className="eyebrow">A street. Different choices.</p><h2 id="street-title" className="mt-1 text-lg">See what changes at ground level</h2></div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Conceptual illustration</span>
    </div>
    <div className="grid lg:grid-cols-[1.6fr_1fr]">
      <div className="relative min-w-0 overflow-hidden" style={{ background: `radial-gradient(ellipse at 75% 15%, ${state.colour}25, transparent 65%)` }}>
        <svg viewBox="0 0 800 430" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="block h-auto w-full">
          <title id={`${id}-title`}>{`${state.name} streetscape`}</title>
          <desc id={`${id}-desc`}>{`${state.caption} This diagram is not a temperature map.`}</desc>
          <defs>
            <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={state.colour} stopOpacity=".32"/><stop offset="1" stopColor={state.colour} stopOpacity=".02"/></linearGradient>
            <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ecd4b3" strokeOpacity=".04"/></pattern>
          </defs>
          <rect width="800" height="430" fill={`url(#${id}-grid)`}/>
          <circle cx="647" cy="89" r="34" fill="#e9b567" opacity=".85"/>
          <circle cx="647" cy="89" r="51" fill="none" stroke="#e9b567" strokeOpacity=".13"/>
          <circle cx="647" cy="89" r="71" fill="none" stroke="#e9b567" strokeOpacity=".08"/>
          <path d="M0 234L70 212 150 226 245 195 320 211 420 180 515 221 620 198 720 211 800 186V360H0Z" fill="#767263" opacity=".08"/>
          <path d="M0 310 L800 310V430H0Z" fill={`url(#${id}-ground)`}/>
          {[{ x: 35, y: 184, w: 94 }, { x: 145, y: 135, w: 90 }, { x: 290, y: 204, w: 113 }, { x: 455, y: 155, w: 88 }, { x: 600, y: 200, w: 144 }].map((b, i) => <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={310 - b.y} fill={i % 2 ? '#403c36' : '#504338'} stroke="#d6b18c" strokeOpacity=".18"/>
            <path d={`M${b.x - 3} ${b.y}h${b.w + 6}`} stroke={state.colour} strokeWidth="4"/>
            {Array.from({ length: 3 }, (_, row) => [0, 1, 2].map(col => <rect key={`${row}-${col}`} x={b.x + 15 + col * 24} y={b.y + 21 + row * 31} width="10" height="15" fill="#d3b994" opacity={.12 + col * .03}/>))}
          </g>)}
          <path d="M0 331H800M0 379H800" stroke="#c6ae8a" strokeOpacity=".16"/>
          <path d="M0 355H800" stroke="#c6ae8a" strokeOpacity=".22" strokeDasharray="28 20"/>
          {[95, 253, 423, 554, 694].map(x => <path key={x} d={`M${x} 296q-12 -20 0 -39t0 -39`} fill="none" stroke="#e09b71" strokeWidth="2" opacity={step === 0 ? .55 : step === 1 ? .25 : .1} className="scene-transition"/>)}
          {[78, 260, 430, 571, 690, 180, 350].map((x, i) => <g key={x} opacity={i < state.trees ? 1 : 0} className="scene-transition">
            <ellipse cx={x + 23} cy="317" rx="48" ry="6" fill="#0d1c17" opacity=".55"/>
            <path d={`M${x} 312V254m0 24 -14 -14m14 5 13 -13`} fill="none" stroke="#b69d76" strokeWidth="5"/>
            <ellipse cx={x} cy="247" rx="30" ry="37" fill={i % 2 ? '#4e7760' : '#5d8669'}/>
            <ellipse cx={x - 10} cy="241" rx="20" ry="26" fill="#83a67e" opacity=".3"/>
          </g>)}
          <g opacity={step === 2 ? 1 : 0} className="scene-transition"><path d="M445 398q90 -29 184 -6q-9 22 -125 16Z" fill="#639aab" opacity=".5"/><path d="M470 396q57 -12 128 -2" fill="none" stroke="#93c1c7" strokeOpacity=".6"/>{[453, 463, 619, 635].map(x => <path key={x} d={`M${x} 396v-16m0 12 -5 -9m5 4 5 -11`} stroke="#8ba481" fill="none"/>)}</g>
          <g stroke="#decdb2" strokeWidth="3" strokeLinecap="round"><circle cx="379" cy="304" r="4" fill="#decdb2"/><path d="M379 312v13m0 -9 -6 5m6 -5 6 4m-6 5 -5 10m5 -10 5 10"/></g>
          <text x="25" y="409" fill="#ac9d87" fontFamily="monospace" fontSize="10" letterSpacing="2">ILLUSTRATION / SAME STREET, DIFFERENT LAND COVER</text>
        </svg>
        <div className="px-5 pb-5 md:px-7"><div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose a streetscape">
          {states.map((item, i) => <button key={item.name} aria-pressed={step === i} onClick={() => setStep(i)} className={`min-h-12 rounded-lg border px-2 py-2 text-xs transition-colors ${step === i ? 'border-amber-200/60 bg-amber-200/10 text-amber-100' : 'border-border text-muted-foreground hover:bg-accent/30'}`}>{item.name}</button>)}
        </div></div>
      </div>
      <div className="flex flex-col justify-center border-t border-border p-6 lg:border-t-0 lg:border-l lg:p-8">
        <div aria-live="polite" aria-atomic="true">
          <p className="font-display text-3xl italic leading-tight">{state.caption}</p>
          <dl className="mt-7 space-y-5">
            {[{ icon: TreePine, name: 'Shade', value: state.shade }, { icon: Sun, name: 'Heat', value: state.heat }, { icon: Droplets, name: 'Water', value: state.water }].map(({ icon: Icon, name, value }) => <div key={name} className="flex gap-3"><Icon size={18} className="mt-0.5 shrink-0 text-emerald-300"/><div><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-1 text-sm">{value}</dd></div></div>)}
          </dl>
        </div>
        <p className="mt-7 text-xs leading-relaxed text-muted-foreground">Mechanisms, not a site-specific forecast. Water supply, humidity and maintenance affect performance. <Link href="/research/blue-green-infrastructure" className="text-emerald-200 underline underline-offset-4">Research & limits</Link></p>
      </div>
    </div>
    <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground md:px-7"><ArrowDown size={14}/> Go deeper: explore a city, change a driver, inspect the evidence.</div>
  </section>
}
