import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, RiskDot, RiskLegend, SimNote } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { categorize, currentRisk, forecastRisk, RISK_LEVELS, type RiskLevel, type WardRisk } from "@/lib/nexus/risk";
import { RISK_HEX, rampHex } from "@/lib/nexus/palette";
import { density, wardByCode } from "@/lib/nexus/wards";
import { fmt1, fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/heatmap")({
  head: () => pageHead("Mumbai ward heatmap", "Interactive Leaflet map of Mumbai's 24 wards with Low, Moderate, High and Critical cholera and typhoid risk zones."),
  component: Heatmap,
});

type Layer = "composite" | "cholera" | "typhoid" | "contamination" | "rainfall" | "scarcity" | "density";
const LAYERS: { value: Layer; label: string; risk: boolean }[] = [
  { value: "composite", label: "Composite risk", risk: true },
  { value: "cholera", label: "Cholera risk", risk: true },
  { value: "typhoid", label: "Typhoid risk", risk: true },
  { value: "contamination", label: "Unfit water samples (%)", risk: false },
  { value: "rainfall", label: "Rainfall (mm)", risk: false },
  { value: "scarcity", label: "Water scarcity index", risk: false },
  { value: "density", label: "Population density", risk: false },
];

function layerValue(r: WardRisk, l: Layer): number {
  switch (l) {
    case "composite": return r.composite;
    case "cholera": return r.cholera.prob;
    case "typhoid": return r.typhoid.prob;
    case "contamination": return r.inputs.unfitPct;
    case "rainfall": return r.inputs.rainfallMm;
    case "scarcity": return r.inputs.scarcityIndex;
    case "density": return density(wardByCode(r.ward));
  }
}
const fmtLayer = (v: number, l: Layer) =>
  l === "composite" || l === "cholera" || l === "typhoid" ? fmtPct(v) : l === "density" ? `${fmtInt(v)}/km²` : l === "rainfall" ? `${fmtInt(v)} mm` : l === "scarcity" ? fmt1(v * 10) + "/10" : `${fmt1(v)}%`;

function Heatmap() {
  const [layer, setLayer] = useState<Layer>("composite");
  const [period, setPeriod] = useState("0");
  const [visible, setVisible] = useState<Record<RiskLevel, boolean>>({ Low: true, Moderate: true, High: true, Critical: true });
  const [selected, setSelected] = useState<string | null>("M/E");
  const rows = useMemo(() => (period === "0" ? currentRisk() : forecastRisk(Number(period))), [period]);
  const meta = LAYERS.find((l) => l.value === layer)!;
  const vals = rows.map((r) => layerValue(r, layer));
  const min = Math.min(...vals), max = Math.max(...vals);

  const styles = Object.fromEntries(
    rows.map((r) => {
      const v = layerValue(r, layer);
      const lvl = categorize(meta.risk ? v : r.composite);
      const fill = meta.risk ? RISK_HEX[categorize(v)] : rampHex((v - min) / (max - min || 1));
      return [r.ward, { fill, opacity: visible[lvl] ? 0.78 : 0.08, tooltip: `<b>Ward ${r.ward}</b> · ${wardByCode(r.ward).areas}<br/>${meta.label}: ${fmtLayer(v, layer)}<br/>Composite: ${r.level}` }];
    }),
  );
  const sel = rows.find((r) => r.ward === selected);
  const sorted = [...rows].sort((a, b) => layerValue(b, layer) - layerValue(a, layer));

  return (
    <Page>
      <PageHeader
        eyebrow="Overview · Leaflet"
        title="Mumbai interactive heatmap"
        description="Ward-level risk zones across the Island City and the Western and Eastern Suburbs. Switch layers, look ahead up to three months, and hide risk bands to focus."
        actions={
          <>
            <Select value={layer} onValueChange={(v) => setLayer(v as Layer)}>
              <SelectTrigger className="h-9 w-[210px] bg-card" aria-label="Map layer"><SelectValue /></SelectTrigger>
              <SelectContent>{LAYERS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-[190px] bg-card" aria-label="Period"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Observed · {currentRisk()[0].month.label}</SelectItem>
                {[1, 2, 3].map((h) => <SelectItem key={h} value={String(h)}>Forecast · {forecastRisk(h)[0].month.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={meta.label}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {RISK_LEVELS.map((l) => (
                <label key={l} className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <Checkbox checked={visible[l]} onCheckedChange={(c) => setVisible((v) => ({ ...v, [l]: c === true }))} aria-label={`Show ${l}`} />
                  <RiskDot level={l} /> {l}
                </label>
              ))}
            </div>
          }
          bodyClassName="p-0"
        >
          <WardMap styles={styles} selected={selected} onSelect={setSelected} height={680} className="rounded-none border-0" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {meta.risk ? <RiskLegend /> : (
              <div className="flex items-center gap-2">
                <span>{fmtLayer(min, layer)}</span>
                <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${rampHex(0)}, ${rampHex(0.5)}, ${rampHex(1)})` }} />
                <span>{fmtLayer(max, layer)}</span>
              </div>
            )}
            <span>Checkboxes filter by composite risk band</span>
          </div>
        </Panel>
        <div className="flex flex-col gap-5">
          {sel && (
            <Panel eyebrow={wardByCode(sel.ward).zone} title={`Ward ${sel.ward}`} actions={<RiskBadge level={sel.level} />}>
              <p className="text-sm text-muted-foreground">{wardByCode(sel.ward).areas}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {[
                  ["Cholera", fmtPct(sel.cholera.prob)], ["Typhoid", fmtPct(sel.typhoid.prob)],
                  ["Unfit samples", `${fmt1(sel.inputs.unfitPct)}%`], ["Rainfall", `${fmtInt(sel.inputs.rainfallMm)} mm`],
                  ["Scarcity", `${fmt1(sel.inputs.scarcityIndex * 10)}/10`], ["Density", `${fmtInt(density(wardByCode(sel.ward)))}/km²`],
                  ["Informal housing", fmtPct(wardByCode(sel.ward).slumShare)], ["Sewer coverage", fmtPct(wardByCode(sel.ward).sewerCoverage)],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="tabular">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/explainable-ai">Why?</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/recommendations">Actions</Link></Button>
              </div>
            </Panel>
          )}
          <Panel eyebrow="Ranked" title="All wards" bodyClassName="p-0">
            <ul className="max-h-[420px] divide-y divide-border overflow-auto">
              {sorted.map((r) => (
                <li key={r.ward}>
                  <button onClick={() => setSelected(r.ward)} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted ${selected === r.ward ? "bg-secondary" : ""}`}>
                    <RiskDot level={r.level} />
                    <span className="min-w-0 flex-1 truncate">{r.ward} · {wardByCode(r.ward).areas.split(",")[0]}</span>
                    <span className="tabular text-xs text-muted-foreground">{fmtLayer(layerValue(r, layer), layer)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <SimNote className="mt-6">Risk bands: Low &lt;30%, Moderate 30–50%, High 50–70%, Critical ≥70% outbreak probability. Values are from the interpretable baseline on simulated data.</SimNote>
    </Page>
  );
}
