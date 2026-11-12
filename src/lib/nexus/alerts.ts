import { forecastRisk, riskHistory, DISEASES, categorize, type Contribution, type Disease, type RiskLevel } from "./risk";
import { LATEST, MONTHS, monthRef } from "./series";
import { WARDS } from "./wards";
import { recommendationsFor } from "./recommendations";

export type AlertStatus = "Active" | "Acknowledged" | "Escalated" | "Resolved";

export interface Alert {
  id: string;
  ward: string;
  disease: Disease;
  level: RiskLevel;
  prob: number;
  monthIdx: number;
  monthLabel: string;
  kind: "Forecast" | "Observed";
  issuedOn: string; // ISO date
  drivers: Contribution[];
  actions: string[];
  defaultStatus: AlertStatus;
}

export interface Thresholds { cholera: number; typhoid: number }

const issueDate = (idx: number, day = 3) => {
  const m = monthRef(idx);
  return `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

let histCache: Alert[] | null = null;
/** Observed alerts: onsets where a ward's disease risk first crossed into High or Critical. */
export function historicalAlerts(): Alert[] {
  if (histCache) return histCache;
  const out: Alert[] = [];
  const h = riskHistory();
  for (const w of WARDS) {
    const rows = h[w.code];
    for (const d of DISEASES) {
      for (let i = 1; i < rows.length; i++) {
        const lv = categorize(rows[i][d].prob);
        const prevLv = categorize(rows[i - 1][d].prob);
        const rank = (l: RiskLevel) => ["Low", "Moderate", "High", "Critical"].indexOf(l);
        if (rank(lv) >= 2 && rank(lv) > rank(prevLv)) {
          const age = LATEST.idx - i;
          out.push({
            id: `obs:${w.code}:${d}:${MONTHS[i].key}`,
            ward: w.code, disease: d, level: lv, prob: rows[i][d].prob,
            monthIdx: i, monthLabel: MONTHS[i].label, kind: "Observed",
            issuedOn: issueDate(i, 1 + ((i * 7 + w.code.length) % 26)),
            drivers: rows[i][d].contributions.filter((c) => c.value > 0).slice(0, 3),
            actions: recommendationsFor(rows[i], 3).map((a) => a.title),
            defaultStatus: age <= 1 ? "Active" : age <= 3 ? "Acknowledged" : "Resolved",
          });
        }
      }
    }
  }
  histCache = out.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
  return histCache;
}

/** Forecast alerts: next-month predictions that meet the user's thresholds. */
export function forecastAlerts(t: Thresholds, horizon = 1): Alert[] {
  const rows = forecastRisk(horizon);
  const idx = LATEST.idx + horizon;
  const out: Alert[] = [];
  for (const r of rows) {
    for (const d of DISEASES) {
      const p = r[d].prob;
      if (p < t[d]) continue;
      out.push({
        id: `fc:${r.ward}:${d}:${r.month.key}`,
        ward: r.ward, disease: d, level: categorize(p) === "Low" || categorize(p) === "Moderate" ? "High" : categorize(p), prob: p,
        monthIdx: idx, monthLabel: r.month.label, kind: "Forecast",
        issuedOn: "2026-11-01",
        drivers: r[d].contributions.filter((c) => c.value > 0).slice(0, 3),
        actions: recommendationsFor(r, 3).map((a) => a.title),
        defaultStatus: "Active",
      });
    }
  }
  return out.sort((a, b) => b.prob - a.prob);
}
