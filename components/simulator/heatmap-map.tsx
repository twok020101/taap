'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { bangalore } from '@/cities/bangalore'
import { zones } from '@/data/bangalore/zones'
import { buildGrid, cellPolygon } from '@/model/grid'
import { simulateGrid } from '@/model/simulate-grid'
import type { Baseline, SliderState, SimContext } from '@/cities/types'
import type { FeatureCollection, Polygon } from 'geojson'

interface HeatmapMapProps {
  baseline: Baseline
  sliders: SliderState
  ctx: SimContext
}

/** Diverging ramp: forest (cold) → neutral → ember → fire (hot). Values are °C from baseline. */
const COLOR_STOPS: Array<[number, string]> = [
  [-5, '#0f3d22'],
  [-3, '#2d6b3f'],
  [-1, '#58836a'],
  [0,  '#7a6f5a'],
  [1,  '#b68244'],
  [3,  '#cd5a22'],
  [5,  '#a4260d'],
  [8,  '#4f0905'],
]

function getHoverColor(delta: number): string {
  const stops = COLOR_STOPS
  if (delta <= stops[0][0]) return stops[0][1]
  if (delta >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]
    const [b, cb] = stops[i + 1]
    if (delta >= a && delta <= b) {
      const t = (delta - a) / (b - a)
      return lerpHex(ca, cb, t)
    }
  }
  return stops[0][1]
}

function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16)
  const bh = parseInt(b.slice(1), 16)
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab2 = ah & 255
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab2 + (bb - ab2) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function HeatmapMap({ baseline, sliders, ctx }: HeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const loadedRef = useRef(false)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const simRef = useRef<Float32Array | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  const grid = useMemo(() => buildGrid(bangalore), [])

  const sim = useMemo(
    () => simulateGrid(baseline, sliders, ctx, grid),
    [baseline, sliders, ctx, grid],
  )

  // ── Build the static GeoJSON once (cells never move) ──────────────────────
  const geojson = useMemo<FeatureCollection<Polygon>>(() => {
    return {
      type: 'FeatureCollection',
      features: grid.cells.map((cell, id) => ({
        type: 'Feature',
        id,
        geometry: {
          type: 'Polygon',
          coordinates: cellPolygon(cell, grid.cellSizeDegLng, grid.cellSizeDegLat),
        },
        properties: {
          canopy: Math.round(cell.canopyFrac * 100),
          builtUp: Math.round(cell.builtUpFrac * 100),
          water: Math.round(cell.waterFrac * 100),
          zone: cell.zone,
        },
      })),
    }
  }, [grid])

  // ── Initialise MapLibre (once) ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: MapLibreMap
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: bangalore.mapStyleUrl,
        center: bangalore.mapCenter,
        zoom: bangalore.mapZoom,
        minZoom: 9,
        maxZoom: 13,
        maxBounds: [
          [bangalore.bbox[0] - 0.15, bangalore.bbox[1] - 0.15],
          [bangalore.bbox[2] + 0.15, bangalore.bbox[3] + 0.15],
        ],
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialise map'
      queueMicrotask(() => setMapError(msg))
      return
    }

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('error', (e) => {
      if (e.error?.message) setMapError(e.error.message)
    })

    map.on('load', () => {
      if (!mapRef.current) return

      map.addSource('heat-grid', { type: 'geojson', data: geojson })

      map.addLayer({
        id: 'heat-fill',
        type: 'fill',
        source: 'heat-grid',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'tempDelta'], 0],
            ...COLOR_STOPS.flat(),
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.95,
            0.72,
          ],
          'fill-outline-color': 'transparent',
        },
      })

      // Zone label layer
      const zoneLabels: FeatureCollection = {
        type: 'FeatureCollection',
        features: (Object.keys(zones) as Array<keyof typeof zones>).map(zk => ({
          type: 'Feature',
          properties: { label: zones[zk].label.split(' ')[0].toUpperCase() },
          geometry: {
            type: 'Point',
            coordinates: bangalore.zoneCentroids[zk],
          },
        })),
      }
      map.addSource('zone-labels', { type: 'geojson', data: zoneLabels })
      map.addLayer({
        id: 'zone-labels',
        type: 'symbol',
        source: 'zone-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-letter-spacing': 0.15,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': 'rgba(240, 230, 215, 0.65)',
          'text-halo-color': 'rgba(10, 10, 10, 0.85)',
          'text-halo-width': 1.2,
        },
      })

      loadedRef.current = true
      const latest = simRef.current
      if (latest) writeFeatureStates(map, latest)
      setMapError(null)
    })

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'heatmap-popup',
      offset: 10,
    })
    popupRef.current = popup

    let hoveredId: number | null = null

    map.on('mousemove', 'heat-fill', (e) => {
      if (!e.features?.length) return
      const f = e.features[0]
      const id = typeof f.id === 'number' ? f.id : null
      if (id === null) return

      if (hoveredId !== null && hoveredId !== id) {
        map.setFeatureState({ source: 'heat-grid', id: hoveredId }, { hover: false })
      }
      hoveredId = id
      map.setFeatureState({ source: 'heat-grid', id }, { hover: true })

      const state = map.getFeatureState({ source: 'heat-grid', id }) as {
        tempDelta?: number
        hover?: boolean
      }
      const delta = state?.tempDelta ?? 0
      const p = f.properties as { canopy: number; builtUp: number; water: number; zone: string }
      const sign = delta >= 0 ? '+' : ''
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="tappop">
             <div class="tappop-delta" style="color:${getHoverColor(delta)}">${sign}${delta.toFixed(1)}°C</div>
             <div class="tappop-sub">${p.zone.charAt(0).toUpperCase() + p.zone.slice(1)} zone</div>
             <div class="tappop-row"><span>Canopy</span><span>${p.canopy}%</span></div>
             <div class="tappop-row"><span>Built-up</span><span>${p.builtUp}%</span></div>
             <div class="tappop-row"><span>Water</span><span>${p.water}%</span></div>
           </div>`,
        )
        .addTo(map)
      map.getCanvas().style.cursor = 'crosshair'
    })

    map.on('mouseleave', 'heat-fill', () => {
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'heat-grid', id: hoveredId }, { hover: false })
        hoveredId = null
      }
      popup.remove()
      map.getCanvas().style.cursor = ''
    })

    return () => {
      popup.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update the feature state on every sim recompute ───────────────────────
  useEffect(() => {
    simRef.current = sim.tempDelta
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    writeFeatureStates(map, sim.tempDelta)
  }, [sim])

  // ── Also update the source if the grid itself changes (future multi-city)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const src = map.getSource('heat-grid') as GeoJSONSource | undefined
    if (src) src.setData(geojson)
  }, [geojson])

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border bg-card shadow-sm md:h-[480px]">
      <div ref={containerRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/85 p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
          <strong className="text-foreground">Map failed to load</strong>
          <span className="max-w-xs">{mapError}</span>
        </div>
      )}
      {!mapError && (
        <>
          <HeatmapLegend />
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[260px] flex-col gap-1.5">
            <div className="self-start rounded-md border border-white/10 bg-black/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/75 backdrop-blur-sm">
              Spatial ΔT · {Math.round(grid.cells.length / 1000)}k cells · 400 m
            </div>
            <div className="rounded-md border border-white/10 bg-black/55 px-2.5 py-1.5 text-[10px] leading-snug text-white/60 backdrop-blur-sm">
              Land-use + zone only. City-wide monsoon &amp; aerosol stay in the readouts.
            </div>
          </div>
        </>
      )}
      <style jsx global>{`
        .maplibregl-ctrl-attrib {
          background: rgba(0, 0, 0, 0.55) !important;
          color: rgba(240, 230, 215, 0.7) !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-attrib a { color: rgba(240, 230, 215, 0.95) !important; }
        .maplibregl-ctrl-group {
          background: rgba(20, 18, 16, 0.7) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          backdrop-filter: blur(6px);
        }
        .maplibregl-ctrl-group button {
          background-color: transparent !important;
          filter: invert(0.85) brightness(1.4);
        }
        .heatmap-popup .maplibregl-popup-content {
          background: rgba(12, 10, 9, 0.92) !important;
          color: #f0e6d7 !important;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 10px 12px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          font-size: 11px;
          min-width: 160px;
        }
        .heatmap-popup .maplibregl-popup-tip { display: none; }
        .tappop-delta {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .tappop-sub {
          margin-top: 2px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(240, 230, 215, 0.55);
        }
        .tappop-row {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
          color: rgba(240, 230, 215, 0.78);
        }
        .tappop-row span:first-child {
          color: rgba(240, 230, 215, 0.5);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          align-self: center;
        }
      `}</style>
    </div>
  )
}

function writeFeatureStates(map: MapLibreMap, deltas: Float32Array) {
  const reduced = prefersReducedMotion()
  if (reduced) {
    for (let i = 0; i < deltas.length; i++) {
      map.setFeatureState({ source: 'heat-grid', id: i }, { tempDelta: deltas[i] })
    }
    return
  }
  // Apply synchronously — MapLibre batches renders to the next frame anyway,
  // so an incremental / staggered update would just prolong the transition
  // without improving smoothness.
  for (let i = 0; i < deltas.length; i++) {
    map.setFeatureState({ source: 'heat-grid', id: i }, { tempDelta: deltas[i] })
  }
}

function HeatmapLegend() {
  // A continuous gradient bar with labelled stops, anchored bottom-left.
  const gradient = `linear-gradient(to right, ${COLOR_STOPS.map(([, c]) => c).join(', ')})`
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/60">
        Δ°C · spatial
      </div>
      <div className="h-2 w-44 rounded-sm" style={{ background: gradient }} aria-hidden />
      <div className="mt-1 flex w-44 justify-between font-mono text-[9px] tabular-nums text-white/70">
        <span>−5</span>
        <span>0</span>
        <span>+5</span>
        <span>+8</span>
      </div>
    </div>
  )
}
