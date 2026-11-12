import { clamp } from "./prng";
import { riskHistory, type Disease } from "./risk";
import { LATEST, MONTH_NAMES, monthRef, wardSeries } from "./series";
import { WARDS, wardByCode } from "./wards";

// ---------- STGNN-style spatial diffusion over the ward graph ----------
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dx = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 110.57;
  return Math.hypot(dx, dy);
};

export interface Edge { a: string; b: string; weight: number; distanceKm: number }
let edgeCache: Edge[] | null = null;
export function wardEdges(): Edge[] {
  if (edgeCache) return edgeCache;
  const out: Edge[] = [];
  for (const w of WARDS) for (const n of w.neighbors) {
    if (w.code < n) {
      const d = km(w, wardByCode(n));
      out.push({ a: w.code, b: n, distanceKm: d, weight: 0 });
    }
  }
  const maxInv = Math.max(...out.map((e) => 1 / e.distanceKm));
  edgeCache = out.map((e) => ({ ...e, weight: 1 / e.distanceKm / maxInv }));
  return edgeCache;
}

export function neighborWeights(code: string) {
  const edges = wardEdges().filter((e) => e.a === code || e.b === code);
  const total = edges.reduce((s, e) => s + e.weight, 0) || 1;
  return edges.map((e) => ({ ward: e.a === code ? e.b : e.a, weight: e.weight / total, distanceKm: e.distanceKm }));
}

/** One or more graph-convolution-like smoothing steps: h' = (1-α)h + α Σ w_ij h_j */
export function diffuse(values: Record<string, number>, alpha: number, hops: number) {
  let h = { ...values };
  for (let k = 0; k < hops; k++) {
    const next: Record<string, number> = {};
    for (const w of WARDS) {
      const nb = neighborWeights(w.code);
      const agg = nb.reduce((s, n) => s + n.weight * h[n.ward], 0);
      next[w.code] = (1 - alpha) * h[w.code] + alpha * agg;
    }
    h = next;
  }
  return h;
}

// ---------- Transformer-style temporal attention and forecast ----------
export function attentionWeights(code: string, disease: Disease, window = 24, targetHorizon = 1) {
  const rows = wardSeries(code).slice(-window);
  const risks = riskHistory()[code].slice(-window);
  const targetMonth = monthRef(LATEST.idx + targetHorizon).month;
  const vec = (i: number) => [
    rows[i].unfitPct / 8, rows[i].rainfallMm / 800, rows[i].scarcityIndex, risks[i][disease].prob,
  ];
  const q = vec(rows.length - 1);
  const logits = rows.map((r, i) => {
    const k = vec(i);
    const dot = q.reduce((s, v, j) => s + v * k[j], 0) / Math.sqrt(q.length);
    const seasonal = r.month === targetMonth ? 1.1 : Math.abs(r.month - targetMonth) === 1 ? 0.4 : 0;
    const recency = (i - rows.length + 1) * 0.04;
    return 2.2 * dot + seasonal + recency;
  });
  const mx = Math.max(...logits);
  const ex = logits.map((l) => Math.exp(l - mx));
  const sum = ex.reduce((s, v) => s + v, 0);
  return rows.map((r, i) => ({ label: `${MONTH_NAMES[r.month]} ${String(r.year).slice(2)}`, weight: ex[i] / sum }));
}

export function seasonalProfile(code: string | "city", disease: Disease) {
  const codes = code === "city" ? WARDS.map((w) => w.code) : [code];
  return MONTH_NAMES.map((name, m) => {
    let total = 0, n = 0;
    for (const c of codes) for (const r of wardSeries(c)) if (r.month === m) { total += r[disease]; n++; }
    return { month: name, avg: (total / n) * codes.length };
  });
}

export function caseForecast(code: string | "city", disease: Disease, horizon = 6) {
  const codes = code === "city" ? WARDS.map((w) => w.code) : [code];
  const prof = seasonalProfile(code, disease);
  const recent = (k: number) => codes.reduce((s, c) => s + wardSeries(c)[LATEST.idx - k][disease], 0);
  const recentSum = recent(0) + recent(1) + recent(2);
  const seasonalSum = [0, 1, 2].reduce((s, k) => s + prof[monthRef(LATEST.idx - k).month].avg, 0) || 1;
  const ratio = clamp(recentSum / seasonalSum, 0.4, 2.5);
  const scarcityBoost = 1.08; // projected post-deficit water cuts
  const history = Array.from({ length: 18 }, (_, i) => {
    const idx = LATEST.idx - 17 + i;
    const m = monthRef(idx);
    return { label: `${MONTH_NAMES[m.month]} ${String(m.year).slice(2)}`, actual: recent(LATEST.idx - idx), forecast: null as number | null, lo: null as number | null, hi: null as number | null };
  });
  const future = Array.from({ length: horizon }, (_, i) => {
    const h = i + 1;
    const m = monthRef(LATEST.idx + h);
    const blend = Math.pow(ratio, Math.max(0.3, 1 - h * 0.12));
    const f = prof[m.month].avg * blend * scarcityBoost;
    const spread = 1.64 * Math.sqrt(Math.max(f, 1)) + f * 0.08 * h;
    return { label: `${MONTH_NAMES[m.month]} ${String(m.year).slice(2)}`, actual: null as number | null, forecast: Math.round(f), lo: Math.max(0, Math.round(f - spread)), hi: Math.round(f + spread) };
  });
  history[history.length - 1].forecast = history[history.length - 1].actual;
  return [...history, ...future];
}

// ---------- Baseline evaluation on the simulated history ----------
export function evaluateBaseline(disease: Disease) {
  const pairs: { s: number; y: number }[] = [];
  for (const w of WARDS) {
    const rows = wardSeries(w.code);
    const sorted = rows.map((r) => r[disease]).sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const risk = riskHistory()[w.code];
    for (let i = 1; i < rows.length; i++) {
      pairs.push({ s: risk[i - 1][disease].prob, y: rows[i][disease] > p75 ? 1 : 0 });
    }
  }
  const pos = pairs.filter((p) => p.y === 1).length;
  const neg = pairs.length - pos;
  const ranked = [...pairs].sort((a, b) => a.s - b.s);
  let rankSum = 0;
  ranked.forEach((p, i) => { if (p.y) rankSum += i + 1; });
  const auc = (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
  const brier = pairs.reduce((s, p) => s + (p.s - p.y) ** 2, 0) / pairs.length;
  // Threshold chosen at prevalence-matched cut for F1
  const cut = ranked[Math.floor(ranked.length * (1 - pos / pairs.length))].s;
  let tp = 0, fp = 0, fn = 0;
  for (const p of pairs) {
    const yhat = p.s >= cut ? 1 : 0;
    if (yhat && p.y) tp++; else if (yhat && !p.y) fp++; else if (!yhat && p.y) fn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  // ROC points
  const roc: { fpr: number; tpr: number }[] = [];
  for (let t = 0; t <= 20; t++) {
    const th = t / 20;
    let a = 0, b = 0;
    for (const p of pairs) if (p.s >= th) { if (p.y) a++; else b++; }
    roc.push({ fpr: b / neg, tpr: a / pos });
  }
  return { auc, brier, precision, recall, f1, n: pairs.length, roc: roc.reverse() };
}
