// NASA GIBS raster snapshotter (2000/2024/2026 MODIS monthly composites).
// 1973 is intentionally NOT fetched — GIBS has no pre-MODIS imagery.
// The UI treats 1973 as a "pre-satellite era" card sourced from LULC reconstruction.
//
// Usage: pnpm rasters --city=<bangalore|delhi|mumbai|chennai>
// Default city: bangalore.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

// WMS 1.1.1 + EPSG:4326 uses minLng,minLat,maxLng,maxLat order.
const CITIES = {
  bangalore: { bbox: '77.35,12.75,77.85,13.15' },
  delhi:     { bbox: '76.84,28.40,77.58,28.88' },
  mumbai:    { bbox: '72.77,18.90,73.05,19.30' },
  chennai:   { bbox: '80.05,12.82,80.33,13.22' },
};

const argCity = process.argv.slice(2).find((a) => a.startsWith('--city='));
const cityId = argCity ? argCity.slice('--city='.length) : 'bangalore';
if (!(cityId in CITIES)) {
  console.error(`[rasters] ERROR: unknown city "${cityId}". Valid: ${Object.keys(CITIES).join(', ')}`);
  process.exit(1);
}

const BBOX = CITIES[cityId].bbox;
const WIDTH = 1024;
const HEIGHT = 820;

const OUT_DIR = join(process.cwd(), 'public', 'rasters', cityId);

const LAYERS = {
  ndvi: 'MODIS_Terra_L3_NDVI_Monthly',
  lst: 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day',
};

// MODIS monthly composite for April 2026 not yet published at time of generation;
// use 2026-03-01 (Q1 2026, latest full month with coverage).
const YEARS = [
  { year: 2000, time: '2000-04-01' },
  { year: 2024, time: '2024-04-01' },
  { year: 2026, time: '2026-03-01' },
];

const EMPTY_SIZE_THRESHOLD = 10 * 1024;

function buildUrl(layer, time) {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    SRS: 'EPSG:4326',
    LAYERS: layer,
    STYLES: '',
    FORMAT: 'image/png',
    TRANSPARENT: 'false',
    BBOX,
    WIDTH: String(WIDTH),
    HEIGHT: String(HEIGHT),
    TIME: time,
  });
  return `${GIBS_WMS}?${params.toString()}`;
}

async function fetchPng(layer, time) {
  const url = buildUrl(layer, time);
  const res = await fetch(url);
  if (!res.ok) return { ok: false, buffer: null, sizeBytes: 0 };
  const buffer = Buffer.from(await res.arrayBuffer());
  return { ok: true, buffer, sizeBytes: buffer.length };
}

async function main() {
  console.log(`[rasters] city=${cityId} bbox=${BBOX} out=${OUT_DIR}`);
  await mkdir(OUT_DIR, { recursive: true });

  const rasterMeta = [];
  const generatedAt = new Date().toISOString();

  for (const { year, time } of YEARS) {
    for (const band of /** @type {const} */ (['ndvi', 'lst'])) {
      const layer = LAYERS[band];
      console.log(`[rasters] fetching ${year} ${band} (${layer}, ${time})...`);
      const { ok, buffer, sizeBytes } = await fetchPng(layer, time);
      if (!ok) {
        console.error(`[rasters] ERROR: fetch failed for ${year} ${band}`);
        process.exit(1);
      }
      if (sizeBytes < EMPTY_SIZE_THRESHOLD) {
        console.error(
          `[rasters] ERROR: response under ${EMPTY_SIZE_THRESHOLD} bytes — likely empty raster for ${year} ${band} (got ${sizeBytes} B)`,
        );
        process.exit(1);
      }

      const outFile = join(OUT_DIR, `${year}-${band}.png`);
      await writeFile(outFile, buffer);
      const kb = Math.round(sizeBytes / 1024);
      console.log(`[rasters] wrote public/rasters/${cityId}/${year}-${band}.png (${kb} KB)`);

      rasterMeta.push({
        year,
        band,
        layer,
        time,
        source: 'NASA GIBS',
        sizeBytes,
        note: '',
      });
    }
  }

  const sourcesJson = JSON.stringify({ cityId, generatedAt, rasters: rasterMeta }, null, 2);
  await writeFile(join(OUT_DIR, 'sources.json'), sourcesJson, 'utf-8');
  console.log(`[rasters] wrote public/rasters/${cityId}/sources.json`);
}

main();
