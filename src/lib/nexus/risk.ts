// Interpretable baseline risk scorer (logistic, additive log-odds).
// It stands in for the planned STGNN + Spatio-Temporal Transformer models; see model-adapter.ts.
import { clamp, round } from "./prng";
import {
  LATEST, MONTHS, ONI_PROJECTION, RAIN_NORMAL, TMAX_NORMAL, citySeries, monthRef, wardSeriesMap,
  type CityMonth, type MonthRef, type WardMonth,
} from "./series";
import { WARDS, density, wardByCode, type Ward } from "./wards";

export type Disease = "cholera" | "typhoid";
export type RiskTarget = Disease | "composite";
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
export const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High", "Critical"];
export const DISEASES: Disease[] = ["cholera", "typhoid"];

export const THRESHOLDS = { moderate: 0.3, high: 0.5, critical: 0.7 } as const;

export function categorize(p: number): RiskLevel {
  if (p >= THRESHOLDS.critical) return "Critical";
  if (p >= THRESHOLDS.high) return "High";
  if (p >= THRESHOLDS.moderate) return "Moderate";
  return "Low";
}

export const FEATURES = [
  { key: "contamination", label: "Water contamination", short: "Contamination" },
  { key: "scarcity", label: "Water scarcity / intermittent supply", short: "Scarcity" },
  { key: "rainfall", label: "Rainfall & waterlogging", short: "Rainfall" },
  { key: "density", label: "Population density", short: "Density" },
  { key: "slum", label: "Informal settlement share", short: "Informal housing" },
  { key: "sanitation", label: "Sewerage coverage gap", short: "Sanitation gap" },
  { key: "flood", label: "Flood-prone terrain", short: "Flood-prone" },
  { key: "heat", label: "Air temperature", short: "Heat" },
  { key: "enso", label: "El Niño signal (ONI)", short: "El Niño" },
  { key: "recentCases", label: "Recent case activity", short: "Recent cases" },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export type FeatureVector = Record<FeatureKey, number>;
export const featureLabel = (k: FeatureKey) => FEATURES.find((f) => f.key === k)!.label;

export const WEIGHTS: Record<Disease, { bias: number; w: FeatureVector }> = {
  cholera: {
    bias: -6.1,
    w: { contamination: 3.0, scarcity: 1.8, rainfall: 1.4, density: 0.6, slum: 1.8, sanitation: 1.2, flood: 0.6, heat: 0.5, enso: 0.7, recentCases: 1.4 },
  },
  typhoid: {
    bias: -5.4,
    w: { contamination: 2.4, scarcity: 1.6, rainfall: 1.0, density: 0.8, slum: 1.4, sanitation: 1.1, flood: 0.4, heat: 0.9, enso: 0.6, recentCases: 1.6 },
  },
};

export interface FeatureInputs {
  unfitPct: number;
  scarcityIndex: number;
  rainfallMm: number;
  tmax: number;
  oni: number;
  prevCholeraPer100k: number;
  prevTyphoidPer100k: number;
}

export function buildFeatures(ward: Ward, x: FeatureInputs, disease: Disease): FeatureVector {
  const prev = disease === "cholera" ? x.prevCholeraPer100k / 2.5 : x.prevTyphoidPer100k / 10;
  return {
    contamination: clamp(x.unfitPct / 8),
    scarcity: clamp(x.scarcityIndex),
    rainfall: clamp(x.rainfallMm / 800),
    density: clamp(density(ward) / 90000),
    slum: clamp(ward.slumShare),
    sanitation: clamp(1 - ward.sewerCoverage),
    flood: clamp(ward.floodProne),
    heat: clamp((x.tmax - 27) / 8),
    enso: clamp((x.oni + 1) / 3.5),
    recentCases: clamp(prev),
  };
}

// Reference point for attributions: a typical (median-ish) Mumbai ward-month.
export const REFERENCE: FeatureVector = {
  contamination: 0.3, scarcity: 0.35, rainfall: 0.15, density: 0.35, slum: 0.42, sanitation: 0.32,
  flood: 0.55, heat: 0.6, enso: 0.3, recentCases: 0.3,
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export interface Contribution { key: FeatureKey; label: string; value: number; feature: number }
export interface Score { prob: number; logit: number; level: RiskLevel; contributions: Contribution[] }

export function score(fv: FeatureVector, disease: Disease): Score {
  const { bias, w } = WEIGHTS[disease];
  let logit = bias;
  const contributions: Contribution[] = [];
  for (const f of FEATURES) {
    logit += w[f.key] * fv[f.key];
    contributions.push({ key: f.key, label: f.label, value: w[f.key] * (fv[f.key] - REFERENCE[f.key]), feature: fv[f.key] });
  }
  const prob = sigmoid(logit);
  return { prob, logit, level: categorize(prob), contributions: contributions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)) };
}

export interface WardRisk {
  ward: string;
  month: MonthRef;
  cholera: Score;
  typhoid: Score;
  composite: number;
  level: RiskLevel;
  inputs: FeatureInputs;
}

export const pick = (r: WardRisk, t: RiskTarget) => (t === "composite" ? r.composite : r[t].prob);

function assemble(ward: Ward, month: MonthRef, x: FeatureInputs): WardRisk {
  const cholera = score(buildFeatures(ward, x, "cholera"), "cholera");
  const typhoid = score(buildFeatures(ward, x, "typhoid"), "typhoid");
  const composite = Math.max(cholera.prob, typhoid.prob);
  return { ward: ward.code, month, cholera, typhoid, composite, level: categorize(composite), inputs: x };
}

function inputsFromHistory(ward: Ward, r: WardMonth, c: CityMonth, prev: WardMonth | undefined): FeatureInputs {
  const p100k = ward.population / 100000;
  return {
    unfitPct: r.unfitPct,
    scarcityIndex: r.scarcityIndex,
    rainfallMm: r.rainfallMm,
    tmax: r.tmax,
    oni: c.oni,
    prevCholeraPer100k: prev ? prev.cholera / p100k : 0.5,
    prevTyphoidPer100k: prev ? prev.typhoid / p100k : 3,
  };
}

let historyCache: Record<string, WardRisk[]> | null = null;
export function riskHistory(): Record<string, WardRisk[]> {
  if (!historyCache) {
    const city = citySeries();
    const ws = wardSeriesMap();
    historyCache = Object.fromEntries(
      WARDS.map((w) => [w.code, ws[w.code].map((r, i) => assemble(w, MONTHS[i], inputsFromHistory(w, r, city[i], ws[w.code][i - 1])))]),
    );
  }
  return historyCache;
}

export const riskAt = (idx: number) => WARDS.map((w) => riskHistory()[w.code][idx]);
export const currentRisk = () => riskAt(LATEST.idx);

// ---------- Forecasting (projected drivers -> baseline scorer) ----------
export interface ProjectionOverrides {
  rainfallChangePct?: number; // -80..+80
  supplyCutPct?: number; // additional supply reduction 0..80
  contaminationChangePct?: number; // -50..+300
  oni?: number; // override ONI
  tempAnomaly?: number; // °C
}

function seasonalMean(code: string, month: number, key: "unfitPct" | "scarcityIndex") {
  const rows = wardSeriesMap()[code].filter((r) => r.month === month);
  return rows.reduce((s, r) => s + r[key], 0) / rows.length;
}

export function projectInputs(code: string, horizon: number, o: ProjectionOverrides = {}): FeatureInputs {
  const ward = wardByCode(code);
  const ws = wardSeriesMap()[code];
  const last = ws[ws.length - 1];
  const city = citySeries()[citySeries().length - 1];
  const m = monthRef(LATEST.idx + horizon);
  const p100k = ward.population / 100000;
  const cutCarry = city.lakeStoragePct < 78 ? 15 : city.lakeStoragePct < 90 ? 10 : 0;
  const baseScarcity = horizon === 0 ? last.scarcityIndex : clamp(1 - (ward.baseSupplyHours * (1 - (cutCarry / 100) * 1.6)) / 6 + cutCarry / 100);
  const supplyCut = (o.supplyCutPct ?? 0) / 100;
  const scarcityIndex = clamp(baseScarcity + supplyCut * 0.9);
  const rainBase = horizon === 0 ? last.rainfallMm : RAIN_NORMAL[m.month] * 0.92;
  const rainfallMm = Math.max(0, rainBase * (1 + (o.rainfallChangePct ?? 0) / 100));
  const unfitBase = horizon === 0 ? last.unfitPct : 0.5 * last.unfitPct + 0.5 * seasonalMean(code, m.month, "unfitPct");
  const unfitPct = clamp(unfitBase * (1 + 0.5 * supplyCut * ward.slumShare) * (1 + (o.contaminationChangePct ?? 0) / 100), 0, 40);
  const tmaxBase = horizon === 0 ? last.tmax : TMAX_NORMAL[m.month] + 0.4;
  const oniBase = horizon === 0 ? city.oni : ONI_PROJECTION[Math.min(horizon - 1, ONI_PROJECTION.length - 1)];
  return {
    unfitPct,
    scarcityIndex,
    rainfallMm,
    tmax: tmaxBase + (o.tempAnomaly ?? 0),
    oni: o.oni ?? oniBase,
    prevCholeraPer100k: last.cholera / p100k,
    prevTyphoidPer100k: last.typhoid / p100k,
  };
}

export function forecastRisk(horizon: number, o: ProjectionOverrides = {}): WardRisk[] {
  const m = monthRef(LATEST.idx + horizon);
  return WARDS.map((w) => assemble(w, m, projectInputs(w.code, horizon, o)));
}

export function scoreInputs(code: string, month: MonthRef, x: FeatureInputs) {
  return assemble(wardByCode(code), month, x);
}

export function levelCounts(rows: WardRisk[], t: RiskTarget = "composite") {
  const out: Record<RiskLevel, number> = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
  for (const r of rows) out[categorize(pick(r, t))]++;
  return out;
}

export const pct = (p: number) => `${round(p * 100, 0)}%`;
