import type { FeatureKey, RiskLevel, WardRisk } from "./risk";

export interface Action {
  id: string;
  title: string;
  detail: string;
  owner: string;
  priority: "Immediate" | "Within 72 h" | "This month";
  driver: FeatureKey | "general";
}

const BY_DRIVER: Record<FeatureKey, Omit<Action, "id" | "priority">[]> = {
  contamination: [
    { title: "Intensify residual-chlorine sampling", detail: "Raise sampling at standposts and ESRs to twice daily; target ≥0.2 mg/L free chlorine at tail ends.", owner: "Hydraulic Engineer / Ward Water Works", driver: "contamination" },
    { title: "Trace and repair leaking mains", detail: "Prioritise pipelines passing through nullahs and drains where negative pressure can draw in sewage.", owner: "Ward Water Works", driver: "contamination" },
  ],
  scarcity: [
    { title: "Chlorinated tanker supply", detail: "Deploy tankers to the lowest-supply pockets and hand out chlorine tablets with storage-hygiene guidance.", owner: "Ward Office", driver: "scarcity" },
    { title: "Safe household storage campaign", detail: "Promote covered containers, dipping ladles and weekly cleaning of overhead tanks.", owner: "Public Health Dept / CHVs", driver: "scarcity" },
  ],
  rainfall: [
    { title: "Pre-emptive desilting and pump readiness", detail: "Clear chronic waterlogging spots and keep dewatering pumps on standby before heavy-rain forecasts.", owner: "Storm Water Drains Dept", driver: "rainfall" },
    { title: "Post-flood water advisory", detail: "Issue boil-water advisories for 72 hours after waterlogging recedes.", owner: "Public Health Dept", driver: "rainfall" },
  ],
  density: [
    { title: "Mobile fever and diarrhoea clinics", detail: "Run evening clinics in the densest clusters to catch cases early.", owner: "Health Posts / Dispensaries", driver: "density" },
  ],
  slum: [
    { title: "ORS and zinc depots", detail: "Stock ORS and zinc at community toilet blocks, anganwadis and health posts.", owner: "Public Health Dept", driver: "slum" },
    { title: "Door-to-door active surveillance", detail: "Community health volunteers screen households for fever ≥3 days and acute watery diarrhoea.", owner: "Epidemiology Cell", driver: "slum" },
  ],
  sanitation: [
    { title: "Community toilet maintenance", detail: "Increase cleaning frequency and fix overflowing septic tanks near water lines.", owner: "Solid Waste Mgmt / Sewerage Ops", driver: "sanitation" },
  ],
  flood: [
    { title: "Map low-lying water connections", detail: "Flag service lines in flood-prone lanes for priority inspection after rain.", owner: "Ward Water Works", driver: "flood" },
  ],
  heat: [
    { title: "Food-vendor hygiene drive", detail: "Inspect street food and juice vendors for safe water and ice sources during hot spells.", owner: "Health Dept / FDA liaison", driver: "heat" },
  ],
  enso: [
    { title: "Plan for an El Niño-weakened monsoon", detail: "Prepare water-cut contingency, tanker contracts and storage advisories ahead of a deficit season.", owner: "Disaster Management Cell", driver: "enso" },
  ],
  recentCases: [
    { title: "Typhoid conjugate vaccination drive", detail: "Offer TCV to children 6 months–15 years in affected sections; investigate clusters for a common source.", owner: "Public Health Dept", driver: "recentCases" },
    { title: "Lab confirmation of clusters", detail: "Send stool and blood cultures to Kasturba Hospital lab to confirm Vibrio cholerae / S. Typhi.", owner: "Epidemiology Cell", driver: "recentCases" },
  ],
};

const priorityFor = (level: RiskLevel, rank: number): Action["priority"] =>
  level === "Critical" ? (rank < 2 ? "Immediate" : "Within 72 h") : level === "High" ? (rank < 1 ? "Within 72 h" : "This month") : "This month";

export function recommendationsFor(r: WardRisk, max = 5): Action[] {
  const contribs = [...r.cholera.contributions, ...r.typhoid.contributions]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const seen = new Set<string>();
  const out: Action[] = [];
  for (const c of contribs) {
    for (const a of BY_DRIVER[c.key]) {
      if (seen.has(a.title)) continue;
      seen.add(a.title);
      out.push({ ...a, id: `${r.ward}:${a.title}`, priority: priorityFor(r.level, out.length) });
      if (out.length >= max) return out;
    }
  }
  if (out.length === 0) {
    out.push({ id: `${r.ward}:routine`, title: "Routine surveillance", detail: "Continue weekly water sampling and syndromic reporting.", owner: "Ward Health Office", priority: "This month", driver: "general" });
  }
  return out;
}
