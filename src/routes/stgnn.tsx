import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, SimNote, Segmented } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentRisk, categorize } from "@/lib/nexus/risk";
import { diffuse, neighborWeights, wardEdges } from "@/lib/nexus/analytics";
import { RISK_HEX, AMBER } from "@/lib/nexus/palette";
import { WARDS, wardByCode } from "@/lib/nexus/wards";
import { fmt1, fmtPct } from "@/lib/nexus/format";
import { MODELS } from "@/lib/nexus/model-adapter";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/stgnn")({
  head: () => pageHead("STGNN model", "Spatio-temporal graph neural network view of Mumbai: ward adjacency, connectivity and spatial spill-over of disease risk."),
  component: Stgnn,
});

function Stgnn() {
  const [selected, setSelected] = useState("G/N");
  const [alpha, setAlpha] = useState(0.35);
  const [hops, setHops] = useState<"1" | "2" | "3">("1");
  const [view, setView] = useState<"raw" | "smoothed">("smoothed");
  const now = useMemo(() => currentRisk(), []);
  const raw = Object.fromEntries(now.map((r) => [r.ward, r.composite]));
  const smooth = useMemo(() => diffuse(raw, alpha, Number(hops)), [alpha, hops]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = view === "raw" ? raw : smooth;
  const edges = wardEdges();
  const nb = neighborWeights(selected);
  const nbSet = new Set(nb.map((n) => n.ward));
  const styles = Object.fromEntries(WARDS.map((w) => [w.code, {
    fill: RISK_HEX[categorize(shown[w.code])],
    opacity: w.code === selected || nbSet.has(w.code) ? 0.85 : 0.35,
    tooltip: `<b>Ward ${w.code}</b><br/>Raw ${fmtPct(raw[w.code])} → graph-smoothed ${fmtPct(smooth[w.code])}`,
  }]));
  const mapEdges = edges.map((e) => ({ ...e, color: e.a === selected || e.b === selected ? AMBER : undefined, weight: e.a === selected || e.b === selected ? Math.max(0.6, e.weight) : e.weight * 0.5 }));
  const spill = nb.reduce((s, n) => s + n.weight * raw[n.ward], 0);
  const deltas = WARDS.map((w) => ({ ward: w.code, raw: raw[w.code], smooth: smooth[w.code], d: smooth[w.code] - raw[w.code] })).sort((a, b) => b.d - a.d);
  const model = MODELS.find((m) => m.id === "stgnn")!;

  return (
    <Page>
      <PageHeader
        eyebrow="AI models · spatial"
        title="STGNN: how wards influence each other"
        description="The planned spatio-temporal graph neural network treats Mumbai's 24 wards as nodes and shared borders as edges. Risk in one ward spills into neighbours through shared pipelines, drains, markets and commuting."
        actions={<span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">Model status: planned · demo uses graph diffusion</span>}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={`Ward graph · ${edges.length} edges`} actions={<Segmented value={view} onChange={setView} options={[{ value: "raw", label: "Raw risk" }, { value: "smoothed", label: "After message passing" }]} />} bodyClassName="p-0">
          <WardMap styles={styles} selected={selected} onSelect={setSelected} edges={mapEdges} height={620} className="rounded-none border-0" />
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel eyebrow="Message passing" title="Graph convolution controls">
            <label className="text-xs text-muted-foreground">Neighbour weight α = {alpha.toFixed(2)}</label>
            <Slider className="mt-2" value={[alpha]} min={0} max={0.9} step={0.05} onValueChange={([v]) => setAlpha(v)} aria-label="Neighbour weight" />
            <div className="mt-4 text-xs text-muted-foreground">Hops (layers)</div>
            <Segmented className="mt-1" value={hops} onChange={setHops} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]} />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">h′ᵢ = (1−α)·hᵢ + α·Σⱼ wᵢⱼ·hⱼ, with wᵢⱼ ∝ 1 / centroid distance among bordering wards. Each hop is one GCN-style layer.</p>
          </Panel>
          <Panel eyebrow={`Ward ${selected}`} title={wardByCode(selected).areas.split(",")[0]} actions={<RiskBadge level={categorize(smooth[selected])} />}>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><div className="text-xs text-muted-foreground">Own</div><div className="tabular font-serif text-xl">{fmtPct(raw[selected])}</div></div>
              <div><div className="text-xs text-muted-foreground">Neighbour pull</div><div className="tabular font-serif text-xl">{fmtPct(spill)}</div></div>
              <div><div className="text-xs text-muted-foreground">Smoothed</div><div className="tabular font-serif text-xl">{fmtPct(smooth[selected])}</div></div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Connected wards (edge weight)</div>
            <ul className="mt-1 space-y-1.5">
              {nb.sort((a, b) => b.weight - a.weight).map((n) => (
                <li key={n.ward} className="flex items-center gap-2 text-sm">
                  <button className="w-10 text-left font-medium text-primary hover:underline" onClick={() => setSelected(n.ward)}>{n.ward}</button>
                  <div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${n.weight * 100}%` }} /></div>
                  <span className="tabular w-16 text-right text-xs text-muted-foreground">{fmt1(n.distanceKm)} km</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Spatial effect" title="Biggest shifts after message passing" bodyClassName="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Ward</TableHead><TableHead className="text-right">Raw</TableHead><TableHead className="text-right">Smoothed</TableHead><TableHead className="text-right">Shift</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...deltas.slice(0, 5), ...deltas.slice(-3)].map((d) => (
                <TableRow key={d.ward} className="cursor-pointer" onClick={() => setSelected(d.ward)}>
                  <TableCell>{d.ward} <span className="text-muted-foreground">· {wardByCode(d.ward).areas.split(",")[0]}</span></TableCell>
                  <TableCell className="tabular text-right">{fmtPct(d.raw)}</TableCell>
                  <TableCell className="tabular text-right">{fmtPct(d.smooth)}</TableCell>
                  <TableCell className={`tabular text-right ${d.d > 0 ? "text-destructive" : "text-primary"}`}>{d.d > 0 ? "+" : ""}{Math.round(d.d * 100)} pts</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel eyebrow="Architecture" title="Planned STGNN pipeline">
          <ol className="space-y-2 text-sm">
            {[
              ["Node features", "Per-ward monthly rainfall, contamination, supply hours, scarcity, temperature, ONI, lagged cases."],
              ["Graph", "24 nodes; edges from shared borders, weighted by distance, pipeline zones and commuter flows."],
              ["Spatial block", "2× graph convolution (ChebConv) to mix neighbour signals."],
              ["Temporal block", "Gated temporal convolution over 12 months, or the Transformer encoder in the hybrid."],
              ["Output", "Per-ward cholera and typhoid outbreak probability for +1 to +3 months."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3"><span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{i + 1}</span><div><div className="font-medium">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div></li>
            ))}
          </ol>
          <div className="mt-4 rounded-md bg-muted p-3 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
            POST {model.endpoint}<br />{"{ horizon: 1, wards: [...24 node feature vectors], edges: [...] }"}<br />→ {"[{ ward, cholera, typhoid }]"}
          </div>
        </Panel>
      </div>
      <SimNote className="mt-6">This page demonstrates the spatial idea with a transparent diffusion step over real ward adjacency. No graph neural network has been trained; the integration point is ready for one.</SimNote>
    </Page>
  );
}
