import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, RiskLegend, Segmented, SimNote } from "@/components/nexus/ui";
import { Button } from "@/components/ui/button";
import { currentRisk, forecastRisk, categorize, pick, type RiskTarget } from "@/lib/nexus/risk";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

const Mumbai3D = lazy(() => import("@/components/nexus/Mumbai3D"));

export const Route = createFileRoute("/mumbai-3d")({
  ssr: false,
  head: () => pageHead("3D Mumbai visualization", "Interactive 3D view of Mumbai's wards, extruded by cholera and typhoid risk or by terrain height."),
  component: ThreeD,
});

function ThreeD() {
  const [target, setTarget] = useState<RiskTarget>("composite");
  const [mode, setMode] = useState<"risk" | "terrain" | "population">("risk");
  const [period, setPeriod] = useState<"0" | "1">("0");
  const [selected, setSelected] = useState<string | null>("M/E");
  const rows = useMemo(() => (period === "0" ? currentRisk() : forecastRisk(1)), [period]);
  const wards = rows.map((r) => {
    const w = wardByCode(r.ward);
    const p = pick(r, target);
    const height = mode === "risk" ? 0.3 + p * 5 : mode === "terrain" ? 0.3 + w.elevationM * 0.2 : 0.3 + (w.population / w.areaKm2) / 18000;
    return { code: r.ward, height, level: categorize(p), label: `Ward ${r.ward} · ${fmtPct(p)}` };
  });
  const sel = rows.find((r) => r.ward === selected);

  return (
    <Page>
      <PageHeader
        eyebrow="Overview · 3D"
        title="3D Mumbai"
        description="Each ward rises by its risk, its average elevation or its population density, and is coloured by risk level. Drag to orbit, scroll to zoom, click a ward for details."
        actions={
          <>
            <Segmented value={mode} onChange={setMode} options={[{ value: "risk", label: "Height = risk" }, { value: "terrain", label: "Terrain" }, { value: "population", label: "Density" }]} />
            <Segmented value={target} onChange={setTarget} options={[{ value: "composite", label: "Composite" }, { value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />
            <Segmented value={period} onChange={setPeriod} options={[{ value: "0", label: "Now" }, { value: "1", label: "+1 mo" }]} />
          </>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title={rows[0].month.label} actions={<RiskLegend />} bodyClassName="p-0">
          <div className="h-[640px] w-full">
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading 3D view…</div>}>
              <Mumbai3D wards={wards} selected={selected} onSelect={setSelected} />
            </Suspense>
          </div>
        </Panel>
        {sel && (
          <Panel eyebrow={wardByCode(sel.ward).zone} title={`Ward ${sel.ward}`} actions={<RiskBadge level={sel.level} />}>
            <p className="text-sm text-muted-foreground">{wardByCode(sel.ward).areas}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Cholera</dt><dd className="tabular font-serif text-xl">{fmtPct(sel.cholera.prob)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Typhoid</dt><dd className="tabular font-serif text-xl">{fmtPct(sel.typhoid.prob)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Avg elevation</dt><dd className="tabular">{wardByCode(sel.ward).elevationM} m</dd></div>
              <div><dt className="text-xs text-muted-foreground">Population</dt><dd className="tabular">{fmtInt(wardByCode(sel.ward).population)}</dd></div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/explainable-ai">Explain this ward</Link></Button>
          </Panel>
        )}
      </div>
      <SimNote className="mt-6">Ward shapes are real MCGM boundaries. Elevations are rough ward averages (exaggerated ×200 vertically) and risk values are simulated. Performance depends on your device's graphics.</SimNote>
    </Page>
  );
}
