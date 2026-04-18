// Open-Meteo ERA5 archive fetcher for Bangalore historical temps (1951–2024).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const LAT = 12.9716;
const LON = 77.5946;
const START_DATE = "1951-01-01";
const END_DATE = "2024-12-31";
const OUTPUT_PATH = "data/bangalore/temperature-history.json";

const BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

function round2(v) {
  return Math.round(v * 100) / 100;
}

function mean(arr) {
  const valid = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

async function main() {
  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", String(LAT));
  url.searchParams.set("longitude", String(LON));
  url.searchParams.set("start_date", START_DATE);
  url.searchParams.set("end_date", END_DATE);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "Asia/Kolkata");

  console.log(`[history] fetching Open-Meteo ERA5 ${START_DATE} → ${END_DATE}...`);

  let data;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    data = await res.json();
  } catch (err) {
    console.error(`[history] fetch/parse error: ${err.message}`);
    process.exit(1);
  }

  const times = data.daily.time;
  const tmaxArr = data.daily.temperature_2m_max;
  const tminArr = data.daily.temperature_2m_min;

  console.log(`[history] ${times.length} daily samples received`);

  // ---- Monthly aggregation ----
  // keyed by "YYYY-MM"
  const monthBuckets = new Map();

  for (let i = 0; i < times.length; i++) {
    const ym = times[i].slice(0, 7); // "YYYY-MM"
    if (!monthBuckets.has(ym)) {
      monthBuckets.set(ym, { tmaxVals: [], tminVals: [] });
    }
    const b = monthBuckets.get(ym);
    const tmax = tmaxArr[i];
    const tmin = tminArr[i];
    // Only push non-null, non-NaN values
    if (tmax !== null && tmax !== undefined && !Number.isNaN(tmax)) b.tmaxVals.push(tmax);
    if (tmin !== null && tmin !== undefined && !Number.isNaN(tmin)) b.tminVals.push(tmin);
  }

  const monthly = [];
  for (const [ym, { tmaxVals, tminVals }] of [...monthBuckets.entries()].sort()) {
    // nDays is based on valid tmax readings (primary guard)
    const nDays = tmaxVals.length;
    if (nDays < 25) continue; // skip sparse months
    monthly.push({
      ym,
      tmaxMean: round2(mean(tmaxVals)),
      tminMean: round2(mean(tminVals)),
      nDays,
    });
  }

  // ---- Annual aggregation ----
  // keyed by year integer
  const yearBuckets = new Map();

  for (let i = 0; i < times.length; i++) {
    const y = parseInt(times[i].slice(0, 4), 10);
    if (!yearBuckets.has(y)) {
      yearBuckets.set(y, { tmaxVals: [], tminVals: [] });
    }
    const b = yearBuckets.get(y);
    const tmax = tmaxArr[i];
    const tmin = tminArr[i];
    if (tmax !== null && tmax !== undefined && !Number.isNaN(tmax)) b.tmaxVals.push(tmax);
    if (tmin !== null && tmin !== undefined && !Number.isNaN(tmin)) b.tminVals.push(tmin);
  }

  const annual = [];
  for (const [y, { tmaxVals, tminVals }] of [...yearBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const nDays = tmaxVals.length;
    if (nDays < 350) continue; // skip incomplete years
    annual.push({
      y,
      tmaxMean: round2(mean(tmaxVals)),
      tminMean: round2(mean(tminVals)),
      nDays,
    });
  }

  // ---- Derived scalars ----
  function annualMeanOfMeans(yearArr, yStart, yEnd, field) {
    const subset = yearArr.filter((r) => r.y >= yStart && r.y <= yEnd).map((r) => r[field]);
    return round2(mean(subset));
  }

  const baseline = {
    tmaxMean: annualMeanOfMeans(annual, 1951, 1980, "tmaxMean"),
    tminMean: annualMeanOfMeans(annual, 1951, 1980, "tminMean"),
  };

  const recent = {
    tmaxMean: annualMeanOfMeans(annual, 2015, 2024, "tmaxMean"),
    tminMean: annualMeanOfMeans(annual, 2015, 2024, "tminMean"),
  };

  const anomaly = {
    tmax: round2(recent.tmaxMean - baseline.tmaxMean),
    tmin: round2(recent.tminMean - baseline.tminMean),
  };

  // ---- Assemble output ----
  const output = {
    meta: {
      source: "Open-Meteo ERA5 Archive",
      url: BASE_URL,
      variable: "temperature_2m (daily max / min)",
      lat: LAT,
      lon: LON,
      timezone: "Asia/Kolkata",
      startDate: START_DATE,
      endDate: END_DATE,
      fetchedAt: new Date().toISOString(),
    },
    baseline1951_1980: baseline,
    recent2015_2024: recent,
    anomalyDegC: anomaly,
    annual,
    monthly,
  };

  const json = JSON.stringify(output, null, 2);
  const sizeKB = Math.round(Buffer.byteLength(json, "utf8") / 1024);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, json, "utf8");

  const sign = anomaly.tmax >= 0 ? "+" : "";
  console.log(
    `[history] wrote ${OUTPUT_PATH} (${sizeKB} KB, ${annual.length} annual / ${monthly.length} monthly rows, anomaly Tmax ${sign}${anomaly.tmax} °C)`
  );
}

main();
