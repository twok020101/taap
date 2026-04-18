// NASA GIBS raster snapshotter for Bangalore (2000/2024/2026 MODIS monthly composites).
// 1973 is intentionally NOT fetched — GIBS has no pre-MODIS imagery for the Bangalore bbox.
// The UI treats 1973 as a "pre-satellite era" card sourced from IISc LULC reconstruction.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

// WMS 1.1.1 + EPSG:4326 uses minLng,minLat,maxLng,maxLat order.
const BBOX = '77.35,12.75,77.85,13.15';
const WIDTH = 1024;
const HEIGHT = 820;

const OUT_DIR = join(process.cwd(), 'public', 'rasters', 'bangalore');

// MODIS monthly composites — much more reliable than daily (which is cloud-gapped).
// TIME must be first-of-month for monthly composites.
const LAYERS = {
  ndvi: 'MODIS_Terra_L3_NDVI_Monthly',
  lst: 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day',
};

// MODIS monthly composite for April 2026 is not yet published at the time of
// generation — use 2026-03-01 (Q1 2026, the latest full month with coverage).
const YEARS = [
  { year: 2000, time: '2000-04-01' },
  { year: 2024, time: '2024-04-01' },
  { year: 2026, time: '2026-03-01' },
];

// A response under this size is almost certainly a transparent "no data" placeholder.
const EMPTY_SIZE_THRESHOLD = 10 * 1024; // 10 KB

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
      console.log(`[rasters] wrote public/rasters/bangalore/${year}-${band}.png (${kb} KB)`);

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

  const sourcesJson = JSON.stringify({ generatedAt, rasters: rasterMeta }, null, 2);
  await writeFile(join(OUT_DIR, 'sources.json'), sourcesJson, 'utf-8');
  console.log('[rasters] wrote public/rasters/bangalore/sources.json');
}

main();
