import { describe, expect, it } from "vitest";
import { categorize, forecastRisk, currentRisk } from "@/lib/nexus/risk";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { WARDS } from "@/lib/nexus/wards";
import { MONTHS, LATEST } from "@/lib/nexus/series";

describe("risk bands", () => {
  it("uses Low <30%, Moderate 30–50%, High 50–70%, Critical ≥70%", () => {
    expect(categorize(0.29)).toBe("Low");
    expect(categorize(0.3)).toBe("Moderate");
    expect(categorize(0.5)).toBe("High");
    expect(categorize(0.7)).toBe("Critical");
  });
});

describe("Mumbai coverage", () => {
  it("covers all 24 MCGM wards", () => {
    expect(WARDS).toHaveLength(24);
    expect(currentRisk()).toHaveLength(24);
  });
  it("history runs Jan 2015 to Oct 2026", () => {
    expect(MONTHS[0].key).toBe("2015-01");
    expect(LATEST.key).toBe("2026-10");
  });
});

describe("early-warning thresholds", () => {
  it("only raises alerts at or above the disease threshold", () => {
    const alerts = forecastAlerts({ cholera: 0.6, typhoid: 0.6 });
    expect(alerts.every((a) => a.prob >= 0.6)).toBe(true);
  });
  it("raising a threshold never adds alerts", () => {
    expect(forecastAlerts({ cholera: 0.8, typhoid: 0.8 }).length).toBeLessThanOrEqual(forecastAlerts({ cholera: 0.5, typhoid: 0.5 }).length);
  });
});

describe("what-if simulator", () => {
  it("more contamination raises risk in every ward", () => {
    const base = forecastRisk(1);
    const worse = forecastRisk(1, { contaminationChangePct: 100 });
    worse.forEach((r, i) => expect(r.composite).toBeGreaterThanOrEqual(base[i].composite));
  });
  it("cutting water supply raises risk in every ward", () => {
    const base = forecastRisk(1);
    const cut = forecastRisk(1, { supplyCutPct: 40 });
    cut.forEach((r, i) => expect(r.composite).toBeGreaterThan(base[i].composite));
  });
});
