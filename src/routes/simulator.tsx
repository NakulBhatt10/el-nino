import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, RiskLegend, Segmented, SimNote, Stat, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categorize, forecastRisk, levelCounts, pick, RISK_LEVELS, type ProjectionOverrides, type RiskTarget } from "@/lib/nexus/risk";
import { RISK_HEX } from "@/lib/nexus/palette";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/simulator")({
  head: () => pageHead("What-if simulator", "Simulate rainfall reduction, water scarcity, contamination and El Niño scenarios and see how Mumbai ward risk changes."),
  component: Simulator,
});

const PRESETS: { name: string; desc: string; o: Required<Omit<ProjectionOverrides, "oni">> & { oni: number | null } }[] = [
  { name: "Baseline", desc: "Projected conditions", o: { rainfallChangePct: 0, supplyCutPct: 0, contaminationChangePct: 0, tempAnomaly: 0, oni: null } },
  { name: "Strong El Niño drought", desc: "Like 2015: weak monsoon, deep water cuts", o: { rainfallChangePct: -40, supplyCutPct: 30, contaminationChangePct: 40, tempAnomaly: 1, oni: 2.4 } },
  { name: "Extreme rain & flooding", desc: "Like July 2005 / 2019 deluges", o: { rainfallChangePct: 80, supplyCutPct: 0, contaminationChangePct: 120, tempAnomaly: 0, oni: null } },
  { name: "Pipeline contamination", desc: "Sewage ingress in mains", o: { rainfallChangePct: 0, supplyCutPct: 10, contaminationChangePct: 200, tempAnomaly: 0, oni: null } },
  { name: "Intervention: chlorination + tankers", desc: "Contamination −40%, supply restored", o: { rainfallChangePct: 0, supplyCutPct: 0, contaminationChangePct: -40, tempAnomaly: 0, oni: null } },
];

function Simulator() {
  const [rain, setRain] = useState(0);
  const [cut, setCut] = useState(0);
  const [cont, setCont] = useState(0);
  const [temp, setTemp] = useState(0);
  const [oni, setOni] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<"1" | "2" | "3">("1");
  const [target, setTarget] = useState<RiskTarget>("composite");
  const [selected, setSelected] = useState<string | null>(null);
  const h = Number(horizon);
  const base = useMemo(() => forecastRisk(h), [h]);
  const scen = useMemo(() => forecastRisk(h, { rainfallChangePct: rain, supplyCutPct: cut, contaminationChangePct: cont, tempAnomaly: temp, ...(oni !== null ? { oni } : {}) }), [h, rain, cut, cont, temp, oni]);
  const bc = levelCounts(base, target), sc = levelCounts(scen, target);
  const deltas = scen.map((r, i) => ({ ward: r.ward, base: pick(base[i], target), scen: pick(r, target), d: pick(r, target) - pick(base[i], target) })).sort((a, b) => b.d - a.d);
  const popAtRisk = (rows: typeof scen) => rows.filter((r) => ["High", "Critical"].includes(categorize(pick(r, target)))).reduce((s, r) => s + wardByCode(r.ward).population, 0);
  const styles = Object.fromEntries(scen.map((r, i) => [r.ward, { fill: RISK_HEX[categorize(pick(r, target))], tooltip: `<b>Ward ${r.ward}</b><br/>Baseline ${fmtPct(pick(base[i], target))} → scenario ${fmtPct(pick(r, target))}` }]));
  const apply = (p: (typeof PRESETS)[number]) => { setRain(p.o.rainfallChangePct); setCut(p.o.supplyCutPct); setCont(p.o.contaminationChangePct); setTemp(p.o.tempAnomaly); setOni(p.o.oni); };
  const dist = RISK_LEVELS.map((l) => ({ level: l, Baseline: bc[l], Scenario: sc[l] }));
  const projectedOni = base[0].inputs.oni;

  const sliders = [
    { label: "Rainfall change", value: rain, set: setRain, min: -80, max: 80, step: 5, fmt: (v: number) => `${v > 0 ? "+" : ""}${v}%` },
    { label: "Additional water supply cut", value: cut, set: setCut, min: 0, max: 60, step: 5, fmt: (v: number) => `${v}%` },
    { label: "Contamination change", value: cont, set: setCont, min: -50, max: 300, step: 10, fmt: (v: number) => `${v > 0 ? "+" : ""}${v}%` },
    { label: "Temperature anomaly", value: temp, set: setTemp, min: -2, max: 3, step: 0.5, fmt: (v: number) => `${v > 0 ? "+" : ""}${v}°C` },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Analysis · scenarios"
        title="What-if simulator"
        description="Push the drivers and watch ward risk respond. Each scenario re-runs the baseline scorer for all 24 wards against the projected conditions."
        actions={
          <>
            <Segmented value={horizon} onChange={setHorizon} options={[{ value: "1", label: "+1 mo" }, { value: "2", label: "+2 mo" }, { value: "3", label: "+3 mo" }]} />
            <Segmented value={target} onChange={setTarget} options={[{ value: "composite", label: "Composite" }, { value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />
          </>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => apply(p)} className="rounded-md border border-border bg-card px-3 py-2 text-left hover:border-primary">
            <div className="text-sm font-medium">{p.name}</div>
            <div className="text-[0.7rem] text-muted-foreground">{p.desc}</div>
          </button>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel eyebrow="Scenario" title="Drivers" actions={<Button variant="ghost" size="sm" className="gap-1" onClick={() => apply(PRESETS[0])}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>}>
          <div className="space-y-5">
            {sliders.map((s) => (
              <div key={s.label}>
                <div className="mb-2 flex justify-between text-sm"><span>{s.label}</span><span className="tabular font-medium">{s.fmt(s.value)}</span></div>
                <Slider value={[s.value]} min={s.min} max={s.max} step={s.step} onValueChange={([v]) => s.set(v)} aria-label={s.label} />
              </div>
            ))}
            <div>
              <div className="mb-2 flex justify-between text-sm"><span>ONI (El Niño strength)</span><span className="tabular font-medium">{oni === null ? `${projectedOni.toFixed(1)} projected` : oni.toFixed(1)}</span></div>
              <Slider value={[oni ?? projectedOni]} min={-2} max={3} step={0.1} onValueChange={([v]) => setOni(v)} aria-label="ONI" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div><div className="text-xs text-muted-foreground">High+Critical wards</div><div className="tabular font-serif text-2xl">{bc.High + bc.Critical} → {sc.High + sc.Critical}</div></div>
            <div><div className="text-xs text-muted-foreground">People in those wards</div><div className="tabular font-serif text-2xl">{(popAtRisk(scen) / 1e6).toFixed(1)}M</div><div className="text-[0.7rem] text-muted-foreground">from {(popAtRisk(base) / 1e6).toFixed(1)}M</div></div>
          </div>
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel title={`Scenario risk · ${base[0].month.label}`} actions={<RiskLegend />} bodyClassName="p-0">
            <WardMap styles={styles} selected={selected} onSelect={setSelected} height={460} className="rounded-none border-0" />
          </Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel eyebrow="Distribution" title="Wards by level">
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={dist}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="level" {...axisProps} />
                    <YAxis {...axisProps} width={24} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Baseline" fill="var(--muted-foreground)" fillOpacity={0.4} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Scenario" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel eyebrow="Impact" title="Largest changes" bodyClassName="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Ward</TableHead><TableHead className="text-right">Base</TableHead><TableHead className="text-right">Scenario</TableHead><TableHead className="text-right">Δ</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...deltas].sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 6).map((d) => (
                    <TableRow key={d.ward} className="cursor-pointer" onClick={() => setSelected(d.ward)}>
                      <TableCell>{d.ward}</TableCell>
                      <TableCell className="tabular text-right">{fmtPct(d.base)}</TableCell>
                      <TableCell className="text-right"><RiskBadge level={categorize(d.scen)} /></TableCell>
                      <TableCell className={`tabular text-right ${d.d > 0 ? "text-destructive" : "text-primary"}`}>{d.d > 0 ? "+" : ""}{Math.round(d.d * 100)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {RISK_LEVELS.slice().reverse().map((l) => <Stat key={l} label={`${l} wards`} value={`${bc[l]} → ${sc[l]}`} tone={l === "Critical" && sc[l] > bc[l] ? "danger" : "default"} />)}
      </div>
      <SimNote className="mt-6">Scenario outputs are model sensitivities on simulated data — useful for comparing options, not for predicting real case numbers. Population figures use Census 2011.</SimNote>
    </Page>
  );
}
