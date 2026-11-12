// Concrete colours for canvas/SVG/WebGL drawing (Leaflet, three.js, jsPDF) that cannot read CSS variables.
// Mirrors the --risk-* tokens in src/styles.css.
import type { RiskLevel } from "./risk";

export const RISK_HEX: Record<RiskLevel, string> = {
  Low: "#6fa98a",
  Moderate: "#e2c35a",
  High: "#dd8a45",
  Critical: "#b2412f",
};
export const RISK_CLASS: Record<RiskLevel, string> = {
  Low: "bg-risk-low",
  Moderate: "bg-risk-moderate",
  High: "bg-risk-high",
  Critical: "bg-risk-critical",
};
export const FOREST = "#1f4b39";
export const AMBER = "#e6a84a";

/** Continuous ramp for non-risk layers (0..1). */
export function rampHex(t: number) {
  const stops = ["#e8efe9", "#b9d3c2", "#7fae94", "#3f7b62", "#1f4b39"];
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = parseInt(stops[i].slice(1), 16), b = parseInt(stops[i + 1].slice(1), 16);
  const mix = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
}
