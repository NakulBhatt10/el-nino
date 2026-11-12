import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, SimNote, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currentRisk, riskHistory } from "@/lib/nexus/risk";
import { LATEST, MONTH_NAMES, MONTHS, wardSeries } from "@/lib/nexus/series";
import { WARDS, density, wardByCode } from "@/lib/nexus/wards";
import { fmt1, fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/compare")({
  head: () => pageHead("Ward comparison", "Compare Mumbai wards side by side on cholera and typhoid risk, rainfall, water quality and vulnerability."),
  component: Compare,
});

const COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-3)"];
const HEX = ["#1f4b39", "#c2683a", "#4f7f99"];

function Compare() {
  const [wards, setWards] = useState<string[]>(["M/E", "G/N", "H/W"]);
  const now = useMemo(() => currentRisk(), []);
  const add = (c: string) => setWards((w) => (w.includes(c) ? w.filter((x) => x !== c) : w.length >= 3 ? [...w.slice(1), c] : [...w, c]));
  const r = (c: string) => now.find((x) => x.ward === c)!;
  const year = (c: string) => wardSeries(c).filter((x) => x.year === LATEST.year);
  const metrics: { label: string; get: (c: string) => number; fmt: (v: number) => string; better: "low" | "high" }[] = [
    { label: "Composite risk", get: (c) => r(c).composite, fmt: fmtPct, better: "low" },
    { label: "Cholera risk", get: (c) => r(c).cholera.prob, fmt: fmtPct, better: "low" },
    { label: "Typhoid risk", get: (c) => r(c).typhoid.prob, fmt: fmtPct, better: "low" },
    { label: `${LATEST.year} rainfall (Jan–Oct)`, get: (c) => year(c).reduce((s, x) => s + x.rainfallMm, 0), fmt: (v) => `${fmtInt(v)} mm`, better: "low" },
    { label: "Unfit water samples", get: (c) => r(c).inputs.unfitPct, fmt: (v) => `${fmt1(v)}%`, better: "low" },
    { label: "Residual chlorine", get: (c) => wardSeries(c)[LATEST.idx].residualChlorine, fmt: (v) => `${v.toFixed(2)} mg/L`, better: "high" },
    { label: "Supply hours/day", get: (c) => wardSeries(c)[LATEST.idx].supplyHours, fmt: (v) => fmt1(v), better: "high" },
    { label: "Scarcity index", get: (c) => r(c).inputs.scarcityIndex * 10, fmt: (v) => `${fmt1(v)}/10`, better: "low" },
    { label: "Population density", get: (c) => density(wardByCode(c)), fmt: (v) => `${fmtInt(v)}/km²`, better: "low" },
    { label: "Informal housing share", get: (c) => wardByCode(c).slumShare, fmt: fmtPct, better: "low" },
    { label: "Sewer coverage", get: (c) => wardByCode(c).sewerCoverage, fmt: fmtPct, better: "high" },
    { label: `Typhoid cases ${LATEST.year}`, get: (c) => year(c).reduce((s, x) => s + x.typhoid, 0), fmt: fmtInt, better: "low" },
  ];
  const radarKeys = [
    { k: "Risk", f: (c: string) => r(c).composite },
    { k: "Contamination", f: (c: string) => Math.min(1, r(c).inputs.unfitPct / 10) },
    { k: "Scarcity", f: (c: string) => r(c).inputs.scarcityIndex },
    { k: "Density", f: (c: string) => Math.min(1, density(wardByCode(c)) / 90000) },
    { k: "Informal housing", f: (c: string) => wardByCode(c).slumShare },
    { k: "Sanitation gap", f: (c: string) => 1 - wardByCode(c).sewerCoverage },
  ];
  const radar = radarKeys.map((m) => ({ metric: m.k, ...Object.fromEntries(wards.map((c) => [c, Math.round(m.f(c) * 100)])) }));
  const trend = MONTHS.slice(-24).map((m) => ({ label: `${MONTH_NAMES[m.month]} ${String(m.year).slice(2)}`, ...Object.fromEntries(wards.map((c) => [c, Math.round(riskHistory()[c][m.idx].composite * 100)])) }));
  const styles = Object.fromEntries(WARDS.map((w) => { const i = wards.indexOf(w.code); return [w.code, { fill: i >= 0 ? HEX[i] : "#dfe7e1", opacity: i >= 0 ? 0.8 : 0.5, tooltip: `Ward ${w.code} · click to ${i >= 0 ? "remove" : "add"}` }]; }));

  return (
    <Page>
      <PageHeader
        eyebrow="Analysis · side by side"
        title="Ward comparison"
        description="Pick up to three wards — from the dropdown or by clicking the map — and compare risk, rainfall, water quality and vulnerability."
        actions={
          <Select value="" onValueChange={add}>
            <SelectTrigger className="h-9 w-[200px] bg-card" aria-label="Add ward"><SelectValue placeholder="Add a ward…" /></SelectTrigger>
            <SelectContent>{WARDS.filter((w) => !wards.includes(w.code)).map((w) => <SelectItem key={w.code} value={w.code}>{w.code} · {w.areas.split(",")[0]}</SelectItem>)}</SelectContent>
          </Select>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {wards.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: HEX[i] }} /> Ward {c} · {wardByCode(c).areas.split(",")[0]}
            <button onClick={() => add(c)} className="rounded-full p-1 hover:bg-muted" aria-label={`Remove ward ${c}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Indicators" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Indicator · {LATEST.label}</th>
                  {wards.map((c, i) => <th key={c} className="px-4 py-2 text-right"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: HEX[i] }} />{c}</span></th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border"><td className="px-4 py-2 text-muted-foreground">Risk level</td>{wards.map((c) => <td key={c} className="px-4 py-2 text-right"><RiskBadge level={r(c).level} /></td>)}</tr>
                {metrics.map((m) => {
                  const vals = wards.map(m.get);
                  const best = m.better === "low" ? Math.min(...vals) : Math.max(...vals);
                  return (
                    <tr key={m.label} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{m.label}</td>
                      {vals.map((v, i) => <td key={wards[i]} className={`tabular px-4 py-2 text-right ${v === best && wards.length > 1 ? "font-semibold text-primary" : ""}`}>{m.fmt(v)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Bold green marks the most favourable value in each row.</p>
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel title="Pick wards" bodyClassName="p-0"><WardMap styles={styles} selected={null} onSelect={add} height={300} className="rounded-none border-0" /></Panel>
          <Panel eyebrow="Profile" title="Vulnerability radar (0–100)">
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={radar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  {wards.map((c, i) => <Radar key={c} dataKey={c} name={`Ward ${c}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />)}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip {...tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
      <Panel className="mt-5" eyebrow="Trend" title="Composite risk, last 24 months (%)">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval={2} />
              <YAxis {...axisProps} width={30} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {wards.map((c, i) => <Line key={c} dataKey={c} name={`Ward ${c}`} stroke={COLORS[i]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <SimNote className="mt-6">Population and area follow Census 2011; all other indicators are simulated demo values.</SimNote>
    </Page>
  );
}
