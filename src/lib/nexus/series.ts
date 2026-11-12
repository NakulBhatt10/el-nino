// Simulated monthly history for Mumbai, Jan 2015 – Oct 2026.
// ONI is approximated from NOAA CPC values (2025–26 simulated). Everything ward-level
// (rainfall split, water quality, supply, cases) is synthetic demo data from a seeded generator.
import { clamp, gauss, hashStr, mulberry32, round } from "./prng";
import { WARDS, type Ward } from "./wards";

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const START_YEAR = 2015;
export const END_YEAR = 2026;
export const END_MONTH = 9; // October (0-based)

export interface MonthRef {
  idx: number;
  key: string; // 2026-10
  year: number;
  month: number; // 0-11
  label: string; // Oct 2026
}

export function monthRef(idx: number): MonthRef {
  const year = START_YEAR + Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  return {
    idx,
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    year,
    month,
    label: `${MONTH_NAMES[month]} ${year}`,
  };
}

export const MONTH_COUNT = (END_YEAR - START_YEAR) * 12 + END_MONTH + 1;
export const MONTHS: MonthRef[] = Array.from({ length: MONTH_COUNT }, (_, i) => monthRef(i));
export const LATEST = MONTHS[MONTHS.length - 1];

// Santacruz-style monthly rainfall normals (mm).
export const RAIN_NORMAL = [1, 1.5, 0.5, 1, 13, 520, 840, 590, 340, 90, 15, 4];
export const TMAX_NORMAL = [31, 31.8, 33, 33.4, 33.8, 32, 29.6, 29.5, 30.6, 33, 33.8, 32.6];
export const TMIN_NORMAL = [17.5, 18.5, 21.5, 24.3, 26.6, 26.2, 25.2, 24.9, 24.6, 23.6, 21.2, 19];

// Approximate ONI (NOAA CPC), 3-month running mean centred on each month.
const ONI: Record<number, number[]> = {
  2015: [0.6, 0.6, 0.7, 0.9, 1.1, 1.4, 1.7, 2.0, 2.3, 2.5, 2.6, 2.6],
  2016: [2.5, 2.1, 1.6, 0.9, 0.4, -0.1, -0.4, -0.5, -0.6, -0.7, -0.7, -0.6],
  2017: [-0.3, -0.2, 0.1, 0.2, 0.3, 0.3, 0.1, -0.1, -0.4, -0.7, -0.8, -1.0],
  2018: [-0.9, -0.9, -0.7, -0.5, -0.2, 0.0, 0.1, 0.2, 0.5, 0.8, 0.9, 0.8],
  2019: [0.7, 0.7, 0.7, 0.7, 0.5, 0.5, 0.3, 0.1, 0.2, 0.3, 0.5, 0.5],
  2020: [0.5, 0.5, 0.4, 0.2, -0.1, -0.3, -0.4, -0.6, -0.9, -1.2, -1.3, -1.2],
  2021: [-1.0, -0.9, -0.8, -0.7, -0.5, -0.4, -0.4, -0.5, -0.7, -0.8, -1.0, -1.0],
  2022: [-1.0, -0.9, -1.0, -1.1, -1.0, -0.9, -0.8, -0.9, -1.0, -1.0, -0.9, -0.8],
  2023: [-0.7, -0.4, -0.1, 0.2, 0.5, 0.8, 1.1, 1.3, 1.6, 1.8, 1.9, 2.0],
  2024: [1.8, 1.5, 1.1, 0.7, 0.4, 0.2, 0.0, -0.1, -0.2, -0.3, -0.4, -0.5],
  2025: [-0.6, -0.4, -0.2, -0.1, -0.1, -0.1, -0.1, -0.2, -0.3, -0.5, -0.5, -0.5],
  2026: [-0.4, -0.2, 0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3],
};
// Forward ONI path used for forecasts (simulated El Niño scenario for winter 2026–27).
export const ONI_PROJECTION = [1.4, 1.5, 1.5, 1.3, 1.0, 0.7];

// Monsoon multiplier per year (approximate shape of Mumbai's recent monsoons; 2026 simulated deficit).
const MONSOON_FACTOR: Record<number, number> = {
  2015: 0.72, 2016: 1.05, 2017: 1.2, 2018: 0.95, 2019: 1.5, 2020: 1.38,
  2021: 1.25, 2022: 1.05, 2023: 0.96, 2024: 1.25, 2025: 1.12, 2026: 0.76,
};

export interface CityMonth extends MonthRef {
  oni: number;
  rainfallMm: number;
  rainfallNormalMm: number;
  tmax: number;
  tmin: number;
  lakeStoragePct: number;
  waterCutPct: number;
}

export interface WardMonth extends MonthRef {
  ward: string;
  rainfallMm: number;
  tmax: number;
  unfitPct: number;
  residualChlorine: number;
  turbidityNtu: number;
  supplyHours: number;
  scarcityIndex: number;
  cholera: number;
  typhoid: number;
}

const LAKE_CAPACITY_ML = 1_447_363;
const MONTHLY_DEMAND_ML = 132_000;
const INFLOW_ML_PER_MM = 470;

function buildCity(): CityMonth[] {
  const rng = mulberry32(20151);
  let storage = 0.58 * LAKE_CAPACITY_ML;
  let octStorage = 0.95;
  const out: CityMonth[] = [];
  for (const m of MONTHS) {
    const oni = ONI[m.year][m.month];
    const monsoon = m.month >= 5 && m.month <= 9;
    const factor = monsoon ? MONSOON_FACTOR[m.year] : 1;
    const noise = monsoon ? 1 + gauss(rng) * 0.16 : Math.max(0, 1 + gauss(rng) * 0.6);
    const rainfallMm = Math.max(0, RAIN_NORMAL[m.month] * factor * noise);
    const tmax = TMAX_NORMAL[m.month] + 0.35 * oni + 0.03 * (m.year - START_YEAR) + gauss(rng) * 0.45;
    const tmin = TMIN_NORMAL[m.month] + 0.25 * oni + 0.025 * (m.year - START_YEAR) + gauss(rng) * 0.4;

    // Water cut policy: if lakes were not near-full by October, cut through May; emergency cut when very low.
    let waterCutPct = 0;
    const dryPeriod = m.month >= 10 || m.month <= 4;
    if (dryPeriod && octStorage < 0.9) waterCutPct = octStorage < 0.78 ? 15 : 10;
    if (storage / LAKE_CAPACITY_ML < 0.12) waterCutPct = Math.max(waterCutPct, 20);

    const inflow = rainfallMm * 1.3 * INFLOW_ML_PER_MM;
    storage = clamp(storage + inflow - MONTHLY_DEMAND_ML * (1 - waterCutPct / 100), 0.04 * LAKE_CAPACITY_ML, LAKE_CAPACITY_ML);
    if (m.month === 9) octStorage = storage / LAKE_CAPACITY_ML;

    out.push({
      ...m,
      oni,
      rainfallMm: round(rainfallMm, 1),
      rainfallNormalMm: RAIN_NORMAL[m.month],
      tmax: round(tmax, 1),
      tmin: round(tmin, 1),
      lakeStoragePct: round((storage / LAKE_CAPACITY_ML) * 100, 1),
      waterCutPct,
    });
  }
  return out;
}

const WARD_RAIN_MULT: Record<string, number> = {
  A: 0.86, B: 0.88, C: 0.88, D: 0.9, E: 0.9, "F/S": 0.92, "F/N": 0.95, "G/S": 0.92, "G/N": 0.95,
  "H/E": 1.0, "H/W": 0.98, "K/E": 1.04, "K/W": 1.0, "P/S": 1.08, "P/N": 1.08, "R/S": 1.12,
  "R/C": 1.15, "R/N": 1.15, L: 1.02, "M/E": 0.96, "M/W": 0.98, N: 1.05, S: 1.12, T: 1.14,
};

function buildWard(ward: Ward, city: CityMonth[]): WardMonth[] {
  const rng = mulberry32(hashStr(ward.code) ^ 0x9e3779b9);
  const pop100k = ward.population / 100_000;
  const out: WardMonth[] = [];
  let prevUnfit = ward.baseUnfitPct;
  for (const c of city) {
    const rainfallMm = Math.max(0, c.rainfallMm * WARD_RAIN_MULT[ward.code] * (1 + gauss(rng) * 0.07));
    const tmax = c.tmax + (ward.zone === "Island City" ? -0.3 : 0.3) + gauss(rng) * 0.2;
    const supplyHours = clamp(ward.baseSupplyHours * (1 - (c.waterCutPct / 100) * 1.6) + gauss(rng) * 0.15, 0.8, 8);
    const scarcityIndex = clamp(1 - supplyHours / 6 + c.waterCutPct / 100 + (c.lakeStoragePct < 20 ? 0.1 : 0));
    const rainRatio = rainfallMm / 700;
    const unfitTarget = ward.baseUnfitPct * (1 + 1.1 * Math.min(rainRatio, 1.6)) * (1 + 0.9 * scarcityIndex * ward.slumShare);
    const unfitPct = clamp(0.6 * unfitTarget + 0.4 * prevUnfit + gauss(rng) * 0.35, 0.1, 18);
    prevUnfit = unfitPct;
    const residualChlorine = clamp(0.62 - 0.035 * unfitPct + gauss(rng) * 0.05, 0.05, 1);
    const turbidityNtu = clamp(1.4 + rainfallMm / 160 + unfitPct * 0.15 + gauss(rng) * 0.3, 0.4, 12);

    const drive =
      0.32 * unfitPct + 0.5 * Math.min(rainRatio, 1.6) + 1.4 * ward.slumShare + 0.9 * scarcityIndex +
      0.12 * (tmax - 30) + 0.8 * (1 - ward.sewerCoverage) + 0.2 * Math.max(0, c.oni);
    const typhoidRate = 0.55 * Math.exp(drive * 0.55);
    const choleraRate = 0.025 * Math.exp(drive * 0.8);
    const typhoid = Math.max(0, Math.round(typhoidRate * pop100k * (1 + gauss(rng) * 0.22)));
    const cholera = Math.max(0, Math.round(choleraRate * pop100k * (1 + gauss(rng) * 0.4) + (rng() < 0.05 ? 1 : 0)));

    out.push({
      idx: c.idx, key: c.key, year: c.year, month: c.month, label: c.label,
      ward: ward.code,
      rainfallMm: round(rainfallMm, 1),
      tmax: round(tmax, 1),
      unfitPct: round(unfitPct, 2),
      residualChlorine: round(residualChlorine, 2),
      turbidityNtu: round(turbidityNtu, 1),
      supplyHours: round(supplyHours, 1),
      scarcityIndex: round(scarcityIndex, 2),
      cholera,
      typhoid,
    });
  }
  return out;
}

let cityCache: CityMonth[] | null = null;
let wardCache: Record<string, WardMonth[]> | null = null;

export function citySeries(): CityMonth[] {
  if (!cityCache) cityCache = buildCity();
  return cityCache;
}

export function wardSeriesMap(): Record<string, WardMonth[]> {
  if (!wardCache) {
    const city = citySeries();
    wardCache = Object.fromEntries(WARDS.map((w) => [w.code, buildWard(w, city)]));
  }
  return wardCache;
}

export const wardSeries = (code: string) => wardSeriesMap()[code];
export const wardMonth = (code: string, idx: number) => wardSeriesMap()[code][idx];
export const cityMonth = (idx: number) => citySeries()[idx];

export function cityCases(idx: number) {
  let cholera = 0, typhoid = 0;
  for (const w of WARDS) {
    const r = wardSeriesMap()[w.code][idx];
    cholera += r.cholera;
    typhoid += r.typhoid;
  }
  return { cholera, typhoid };
}

export const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
