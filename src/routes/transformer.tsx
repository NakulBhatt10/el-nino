import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat, WardSelect, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { attentionWeights, caseForecast, seasonalProfile } from "@/lib/nexus/analytics";
import type { Disease } from "@/lib/nexus/risk";
import { fmt1, fmtInt } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/transformer")({
  head: () => pageHead("Spatio-temporal transformer", "Temporal pattern analysis and six-month cholera and typhoid forecasts for Mumbai wards."),
  component: TransformerPage,
});

function TransformerPage() {
  const [ward, setWard] = useState("city");
  const [disease, setDisease] = useState<Disease>("typhoid");
  const [horizon, setHorizon] = useState<"3" | "6">("6");
  const fc = useMemo(() => caseForecast(ward, disease, Number(horizon)), [ward, disease, horizon]);
  const att = useMemo(() => attentionWeights(ward === "city" ? "L" : ward, disease, 24), [ward, disease]);
  const season = seasonalProfile(ward, disease);
  const future = fc.filter((r) => r.actual === null);
  const total = future.reduce((s, r) => s + (r.forecast ?? 0), 0);
  const top = [...att].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const band = fc.map((r) => ({ ...r, band: r.lo !== null && r.hi !== null ? [r.lo, r.hi] : null }));

  return (
    <Page>
      <PageHeader
        eyebrow="AI models · temporal"
        title="Spatio-temporal transformer"
        description="Self-attention lets the model look back across two years of ward history and weigh the months that resemble what's coming — last year's same season, recent contamination spikes, the start of a water cut."
        actions={
          <>
            <WardSelect value={ward} onChange={setWard} includeCity />
            <Segmented value={disease} onChange={setDisease} options={[{ value: "typhoid", label: "Typhoid" }, { value: "cholera", label: "Cholera" }]} />
            <Segmented value={horizon} onChange={setHorizon} options={[{ value: "3", label: "3 mo" }, { value: "6", label: "6 mo" }]} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`Forecast cases, next ${horizon} months`} value={fmtInt(total)} sub={ward === "city" ? "All Mumbai" : `Ward ${ward}`} />
        <Stat label="Next month" value={fmtInt(future[0]?.forecast ?? 0)} sub={`90% range ${fmtInt(future[0]?.lo ?? 0)}–${fmtInt(future[0]?.hi ?? 0)}`} />
        <Stat label="Most-attended month" value={top[0].label} sub={`${fmt1(top[0].weight * 100)}% of attention`} />
        <Stat label="Seasonal peak" value={season.reduce((a, b) => (b.avg > a.avg ? b : a)).month} sub="Historical average" />
      </div>
      <Panel className="mt-5" eyebrow="Forecast" title={`${disease === "typhoid" ? "Typhoid" : "Cholera"} cases: 18 months observed + ${horizon} months forecast`}>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={band}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval={1} />
              <YAxis {...axisProps} width={40} />
              <Tooltip {...tooltipStyle} formatter={(v: number | number[]) => (Array.isArray(v) ? `${v[0]}–${v[1]}` : v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="band" name="90% interval" stroke="none" fill="var(--chart-2)" fillOpacity={0.25} />
              <Bar dataKey="actual" name="Observed" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
              <Line dataKey="forecast" name="Forecast" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="5 3" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Attention" title={`Which past months the next forecast attends to${ward === "city" ? " (Ward L shown)" : ""}`}>
          <div className="grid grid-cols-12 gap-1">
            {att.map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-1">
                <div className="h-10 w-full rounded-sm border border-border" style={{ background: `color-mix(in oklab, var(--primary) ${Math.min(100, a.weight * 900)}%, var(--card))` }} title={`${a.label}: ${fmt1(a.weight * 100)}%`} />
                <span className="text-[0.55rem] text-muted-foreground">{a.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Darker cells get more weight. Here the strongest are {top.map((t) => t.label).join(", ")} — the same season last year and the latest months. Weights are an attention-style similarity kernel over contamination, rainfall, scarcity and risk; a trained Transformer would learn them.
          </p>
        </Panel>
        <Panel eyebrow="Temporal pattern" title="Average cases by calendar month">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={season}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmt1(v)} />
                <Bar dataKey="avg" name="Average" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel className="mt-5" eyebrow="Architecture" title="Planned Transformer encoder">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ["Input tokens", "One token per ward-month: 10 drivers + calendar embedding + ward embedding."],
            ["Encoder", "4 layers × 4 heads, causal mask over a 24-month window."],
            ["Spatial fusion", "Hybrid mode adds STGNN node embeddings to each token."],
            ["Heads", "Poisson count head + outbreak probability head, quantiles for intervals."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-md border border-border p-3"><div className="font-medium">{t}</div><div className="mt-1 text-xs text-muted-foreground">{d}</div></div>
          ))}
        </div>
      </Panel>
      <SimNote className="mt-6">The forecast blends each ward's seasonal profile with its recent trend and a projected water-cut effect. It is a transparent stand-in; the Transformer itself is planned and untrained.</SimNote>
    </Page>
  );
}
