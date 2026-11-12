import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, Segmented, SimNote, WardSelect, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { currentRisk, forecastRisk, FEATURES, WEIGHTS, REFERENCE, categorize, type Disease } from "@/lib/nexus/risk";
import { RISK_HEX } from "@/lib/nexus/palette";
import { wardByCode } from "@/lib/nexus/wards";
import { fmt1, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/explainable-ai")({
  head: () => pageHead("Explainable AI", "Feature attribution showing which climate, water and social factors drive each Mumbai ward's predicted cholera and typhoid risk."),
  component: Xai,
});

function Xai() {
  const [ward, setWard] = useState("M/E");
  const [disease, setDisease] = useState<Disease>("cholera");
  const [period, setPeriod] = useState<"now" | "next">("now");
  const rows = useMemo(() => (period === "now" ? currentRisk() : forecastRisk(1)), [period]);
  const r = rows.find((x) => x.ward === ward)!;
  const s = r[disease];
  const data = [...s.contributions].sort((a, b) => b.value - a.value).map((c) => ({ name: FEATURES.find((f) => f.key === c.key)!.short, value: Math.round(c.value * 100) / 100, feature: c.feature, full: c.label }));
  const global = FEATURES.map((f) => ({
    name: f.short,
    value: Math.round((rows.reduce((acc, x) => acc + Math.abs(x[disease].contributions.find((c) => c.key === f.key)!.value), 0) / rows.length) * 100) / 100,
  })).sort((a, b) => b.value - a.value);
  const ups = s.contributions.filter((c) => c.value > 0.05).slice(0, 3);
  const downs = s.contributions.filter((c) => c.value < -0.05).slice(0, 2);
  const refLogit = WEIGHTS[disease].bias + FEATURES.reduce((acc, f) => acc + WEIGHTS[disease].w[f.key] * REFERENCE[f.key], 0);
  const refProb = 1 / (1 + Math.exp(-refLogit));

  return (
    <Page>
      <PageHeader
        eyebrow="AI models · transparency"
        title="Explainable AI"
        description="Every prediction breaks down into additive contributions from ten drivers, measured against a typical Mumbai ward-month. Positive bars push risk up; negative bars pull it down."
        actions={
          <>
            <WardSelect value={ward} onChange={setWard} />
            <Segmented value={disease} onChange={setDisease} options={[{ value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />
            <Segmented value={period} onChange={setPeriod} options={[{ value: "now", label: r.month.label === rows[0].month.label && period === "now" ? "Observed" : "Observed" }, { value: "next", label: "Next month" }]} />
          </>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel eyebrow={`Ward ${ward} · ${r.month.label}`} title={`Why ${disease} risk is ${fmtPct(s.prob)}`} actions={<RiskBadge level={categorize(s.prob)} />}>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={110} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v > 0 ? "+" : ""}${v} log-odds`, "Contribution"]} />
                <ReferenceLine x={0} stroke="var(--muted-foreground)" />
                <Bar dataKey="value" radius={2}>
                  {data.map((d) => <Cell key={d.name} fill={d.value >= 0 ? RISK_HEX.Critical : RISK_HEX.Low} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Baseline for a typical ward-month: {fmtPct(refProb)}. Contributions are in log-odds and sum to the gap between that baseline and this ward.</p>
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel eyebrow="Plain-language summary" title={`Ward ${ward} · ${wardByCode(ward).areas.split(",")[0]}`}>
            <p className="text-sm leading-relaxed">
              {disease === "cholera" ? "Cholera" : "Typhoid"} risk is <strong>{categorize(s.prob).toLowerCase()}</strong> at {fmtPct(s.prob)}.
              {ups.length > 0 && <> It is pushed up mostly by {ups.map((c) => c.label.toLowerCase()).join(", ")}.</>}
              {downs.length > 0 && <> {downs.map((c) => c.label).join(" and ")} {downs.length > 1 ? "hold" : "holds"} it down.</>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Unfit samples</dt><dd className="tabular">{fmt1(r.inputs.unfitPct)}%</dd></div>
              <div><dt className="text-xs text-muted-foreground">Scarcity index</dt><dd className="tabular">{fmt1(r.inputs.scarcityIndex * 10)}/10</dd></div>
              <div><dt className="text-xs text-muted-foreground">Rainfall</dt><dd className="tabular">{Math.round(r.inputs.rainfallMm)} mm</dd></div>
              <div><dt className="text-xs text-muted-foreground">ONI</dt><dd className="tabular">{fmt1(r.inputs.oni)}</dd></div>
            </dl>
          </Panel>
          <Panel eyebrow="Global importance" title="Mean |contribution| across wards">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={global} layout="vertical">
                  <XAxis type="number" {...axisProps} hide />
                  <YAxis type="category" dataKey="name" {...axisProps} width={110} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" name="Importance" fill="var(--chart-1)" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
      <Panel className="mt-5" eyebrow="Method" title="Model weights (log-odds per unit of normalised driver)" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Driver</th><th className="px-4 py-2 text-right font-medium">Cholera</th><th className="px-4 py-2 text-right font-medium">Typhoid</th><th className="px-4 py-2 text-right font-medium">This ward (0–1)</th></tr></thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="tabular px-4 py-2 text-right">{WEIGHTS.cholera.w[f.key].toFixed(1)}</td>
                  <td className="tabular px-4 py-2 text-right">{WEIGHTS.typhoid.w[f.key].toFixed(1)}</td>
                  <td className="tabular px-4 py-2 text-right">{s.contributions.find((c) => c.key === f.key)!.feature.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <SimNote className="mt-6">Attributions are exact for this additive baseline. For the planned STGNN/Transformer, the same view would be filled by SHAP values and attention maps returned from the model service.</SimNote>
    </Page>
  );
}
