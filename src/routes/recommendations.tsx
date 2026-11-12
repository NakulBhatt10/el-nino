import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, Segmented, SimNote, Stat } from "@/components/nexus/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { forecastRisk, currentRisk } from "@/lib/nexus/risk";
import { recommendationsFor } from "@/lib/nexus/recommendations";
import { setNexus, useNexus } from "@/lib/nexus/store";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/recommendations")({
  head: () => pageHead("Public health recommendations", "Action plans and preventive measures for Mumbai's high-risk wards, matched to what is driving their risk."),
  component: Recs,
});

function Recs() {
  const s = useNexus();
  const [period, setPeriod] = useState<"next" | "now">("next");
  const [scope, setScope] = useState<"critical" | "high">("high");
  const rows = useMemo(() => (period === "next" ? forecastRisk(1) : currentRisk()), [period]);
  const wards = rows.filter((r) => (scope === "critical" ? r.level === "Critical" : r.level === "Critical" || r.level === "High")).sort((a, b) => b.composite - a.composite);
  const plans = wards.map((r) => ({ r, actions: recommendationsFor(r, 5) }));
  const allActions = plans.flatMap((p) => p.actions);
  const done = allActions.filter((a) => s.completedActions.includes(a.id)).length;
  const toggle = (id: string) => setNexus((st) => ({ ...st, completedActions: st.completedActions.includes(id) ? st.completedActions.filter((x) => x !== id) : [...st.completedActions, id] }));
  const pop = wards.reduce((acc, r) => acc + wardByCode(r.ward).population, 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Early warning · response"
        title="Public health recommendations"
        description="Action plans for each high-risk ward, ranked by what is driving its risk. Tick actions off as the ward team completes them."
        actions={
          <>
            <Segmented value={period} onChange={setPeriod} options={[{ value: "next", label: `Forecast ${forecastRisk(1)[0].month.label}` }, { value: "now", label: "Current" }]} />
            <Segmented value={scope} onChange={setScope} options={[{ value: "high", label: "High + Critical" }, { value: "critical", label: "Critical only" }]} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Wards needing action" value={wards.length} />
        <Stat label="People in those wards" value={fmtInt(pop)} sub="Census 2011 basis" />
        <Stat label="Actions planned" value={allActions.length} />
        <Stat label="Completed" value={`${done} / ${allActions.length}`} sub={allActions.length ? fmtPct(done / allActions.length) : "—"} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {plans.map(({ r, actions }) => (
          <Panel key={r.ward} eyebrow={wardByCode(r.ward).zone} title={`Ward ${r.ward} · ${wardByCode(r.ward).areas.split(",").slice(0, 2).join(",")}`} actions={<RiskBadge level={r.level} />}>
            <div className="mb-3 text-xs text-muted-foreground">Cholera {fmtPct(r.cholera.prob)} · Typhoid {fmtPct(r.typhoid.prob)} · {fmtInt(wardByCode(r.ward).population)} residents</div>
            <ul className="space-y-3">
              {actions.map((a) => {
                const checked = s.completedActions.includes(a.id);
                return (
                  <li key={a.id} className="flex gap-3">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(a.id)} className="mt-0.5" aria-label={`Mark ${a.title} done`} />
                    <div className={`min-w-0 ${checked ? "text-muted-foreground line-through" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{a.title}<span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ${a.priority === "Immediate" ? "bg-destructive text-destructive-foreground" : a.priority === "Within 72 h" ? "bg-signal text-signal-foreground" : "bg-secondary text-secondary-foreground"}`}>{a.priority}</span></div>
                      <div className="text-xs leading-relaxed text-muted-foreground">{a.detail}</div>
                      <div className="mt-0.5 text-[0.7rem] text-primary">{a.owner}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
        {plans.length === 0 && <Panel><p className="py-6 text-center text-sm text-muted-foreground">No wards at this level.</p></Panel>}
      </div>
      <Panel className="mt-5" eyebrow="Citywide" title="Standing preventive measures">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          {[
            ["Safe water", "Boil or chlorinate drinking water; store in narrow-mouthed covered containers; never dip hands into stored water."],
            ["Sanitation & hygiene", "Handwashing with soap before eating and after toilet use; keep community toilets functional and lit."],
            ["Early care", "Start ORS at the first loose stool; seek care for fever beyond 3 days; complete prescribed antibiotics."],
          ].map(([t, d]) => <div key={t} className="rounded-md border border-border p-3"><div className="font-medium">{t}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</p></div>)}
        </div>
      </Panel>
      <SimNote className="mt-6">Recommendations are rule-based guidance tied to model drivers, not official MCGM orders. Completion ticks are stored in this browser only.</SimNote>
    </Page>
  );
}
