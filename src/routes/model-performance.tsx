import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { evaluateBaseline } from "@/lib/nexus/analytics";
import { MODELS } from "@/lib/nexus/model-adapter";
import type { Disease } from "@/lib/nexus/risk";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/model-performance")({
  head: () => pageHead("Model performance", "Compare the baseline, STGNN, Spatio-Temporal Transformer and hybrid models on AUC, F1, Brier score and forecast horizon."),
  component: Perf,
});

// Planning targets for the untrained models — not measured results.
const TARGETS = {
  stgnn: { auc: 0.82, f1: 0.62, brier: 0.14, mae: 3.1 },
  transformer: { auc: 0.84, f1: 0.64, brier: 0.13, mae: 2.8 },
  hybrid: { auc: 0.87, f1: 0.68, brier: 0.12, mae: 2.5 },
};

function Perf() {
  const [disease, setDisease] = useState<Disease>("typhoid");
  const base = useMemo(() => evaluateBaseline(disease), [disease]);
  const rows = [
    { id: "baseline", name: "Baseline (measured)", auc: base.auc, f1: base.f1, brier: base.brier, measured: true },
    { id: "stgnn", name: "STGNN (target)", ...TARGETS.stgnn, measured: false },
    { id: "transformer", name: "Transformer (target)", ...TARGETS.transformer, measured: false },
    { id: "hybrid", name: "Hybrid (target)", ...TARGETS.hybrid, measured: false },
  ];
  const bars = [
    { metric: "AUC", ...Object.fromEntries(rows.map((r) => [r.id, Math.round(r.auc * 100) / 100])) },
    { metric: "F1", ...Object.fromEntries(rows.map((r) => [r.id, Math.round(r.f1 * 100) / 100])) },
    { metric: "1 − Brier", ...Object.fromEntries(rows.map((r) => [r.id, Math.round((1 - r.brier) * 100) / 100])) },
  ];
  const horizon = [1, 2, 3].map((h) => ({
    h: `+${h} mo`,
    baseline: Math.round((base.auc - 0.03 * (h - 1)) * 100) / 100,
    stgnn: Math.round((TARGETS.stgnn.auc - 0.025 * (h - 1)) * 100) / 100,
    transformer: Math.round((TARGETS.transformer.auc - 0.02 * (h - 1)) * 100) / 100,
    hybrid: Math.round((TARGETS.hybrid.auc - 0.018 * (h - 1)) * 100) / 100,
  }));
  const colors: Record<string, string> = { baseline: "var(--chart-3)", stgnn: "var(--chart-1)", transformer: "var(--chart-2)", hybrid: "var(--chart-4)" };

  return (
    <Page>
      <PageHeader
        eyebrow="AI models · evaluation"
        title="Model performance"
        description="The baseline is actually evaluated here — one-month-ahead, on the simulated history, against months where a ward's cases exceeded its own 75th percentile. STGNN, Transformer and hybrid figures are planning targets until those models are trained."
        actions={<Segmented value={disease} onChange={setDisease} options={[{ value: "typhoid", label: "Typhoid" }, { value: "cholera", label: "Cholera" }]} />}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Baseline AUC (measured)" value={base.auc.toFixed(3)} sub={`${base.n.toLocaleString("en-IN")} ward-months`} />
        <Stat label="Baseline F1" value={base.f1.toFixed(3)} sub={`Precision ${base.precision.toFixed(2)} · recall ${base.recall.toFixed(2)}`} />
        <Stat label="Brier score" value={base.brier.toFixed(3)} sub="Lower is better" />
        <Stat label="Hybrid AUC target" value={TARGETS.hybrid.auc.toFixed(2)} sub="Not yet trained" tone="warn" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Comparison" title="Headline metrics (higher is better)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={bars}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="metric" {...axisProps} />
                <YAxis {...axisProps} width={32} domain={[0, 1]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {rows.map((r) => <Bar key={r.id} dataKey={r.id} name={r.name} fill={colors[r.id]} fillOpacity={r.measured ? 1 : 0.55} radius={[2, 2, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Baseline" title="ROC curve (measured)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={base.roc}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} {...axisProps} tickFormatter={(v: number) => v.toFixed(1)} label={{ value: "False positive rate", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis dataKey="tpr" type="number" domain={[0, 1]} {...axisProps} width={32} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => v.toFixed(2)} />
                <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" stroke="var(--muted-foreground)" strokeDasharray="4 3" dot={false} name="Chance" />
                <Line dataKey="tpr" stroke="var(--chart-1)" strokeWidth={2} dot={false} name="Baseline" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel eyebrow="Horizon" title="AUC by forecast horizon">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={horizon}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="h" {...axisProps} />
                <YAxis {...axisProps} width={36} domain={[0.5, 0.95]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {rows.map((r) => <Line key={r.id} dataKey={r.id} name={r.name} stroke={colors[r.id]} strokeWidth={2} strokeDasharray={r.measured ? undefined : "5 3"} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Baseline +2/+3 month values are an assumed decay; dashed lines are targets.</p>
        </Panel>
        <Panel eyebrow="Registry" title="Models" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Model</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Integration</th></tr></thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-2.5"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.description}</div></td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${m.status === "running" ? "bg-primary text-primary-foreground" : "border border-dashed border-border text-muted-foreground"}`}>{m.status === "running" ? "Running (demo)" : "Planned"}</span></td>
                  <td className="px-4 py-2.5 font-mono text-[0.7rem] text-muted-foreground">{m.endpoint ?? "in-browser"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <SimNote className="mt-6">Baseline metrics are computed live from simulated data, so they show the pipeline works — not real-world accuracy. Replace with backtests on MCGM surveillance data once models are trained.</SimNote>
    </Page>
  );
}
