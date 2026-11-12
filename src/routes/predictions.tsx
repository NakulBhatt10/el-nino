import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, RiskLegend, Segmented, SimNote, Stat } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { categorize, currentRisk, forecastRisk, levelCounts, pick, type RiskTarget } from "@/lib/nexus/risk";
import { RISK_HEX } from "@/lib/nexus/palette";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/predictions")({
  head: () => pageHead("AI risk prediction", "Upcoming ward-level cholera and typhoid risk for Mumbai over the next one to three months."),
  component: Predictions,
});

function Predictions() {
  const [horizon, setHorizon] = useState<"1" | "2" | "3">("1");
  const [target, setTarget] = useState<RiskTarget>("composite");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const now = useMemo(() => currentRisk(), []);
  const fc = useMemo(() => forecastRisk(Number(horizon)), [horizon]);
  const counts = levelCounts(fc, target);
  const rows = fc
    .map((r) => {
      const p = pick(r, target);
      const prev = pick(now.find((n) => n.ward === r.ward)!, target);
      const top = (target === "cholera" ? r.cholera : r.typhoid).contributions.find((c) => c.value > 0);
      return { r, p, prev, delta: p - prev, level: categorize(p), top: top?.label ?? "—" };
    })
    .filter((x) => !q || `${x.r.ward} ${wardByCode(x.r.ward).areas}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.p - a.p);
  const styles = Object.fromEntries(fc.map((r) => [r.ward, { fill: RISK_HEX[categorize(pick(r, target))], tooltip: `<b>Ward ${r.ward}</b> · ${fc[0].month.label}<br/>Cholera ${fmtPct(r.cholera.prob)} · Typhoid ${fmtPct(r.typhoid.prob)}` }]));

  return (
    <Page>
      <PageHeader
        eyebrow="AI models · forecast"
        title="AI risk prediction"
        description={`Projected outbreak probability per ward for ${fc[0].month.label}. Drivers are projected from the post-monsoon lake deficit, expected water cuts, seasonal contamination and the ONI path.`}
        actions={
          <>
            <Segmented value={horizon} onChange={setHorizon} options={[{ value: "1", label: "+1 month" }, { value: "2", label: "+2 months" }, { value: "3", label: "+3 months" }]} />
            <Segmented value={target} onChange={setTarget} options={[{ value: "composite", label: "Composite" }, { value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["Critical", "High", "Moderate", "Low"] as const).map((l) => (
          <Stat key={l} label={`${l} wards`} value={counts[l]} sub={`${fc[0].month.label} · ${target}`} tone={l === "Critical" && counts[l] > 0 ? "danger" : "default"} />
        ))}
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title={`Predicted ${target} risk`} actions={<RiskLegend />} bodyClassName="p-0">
          <WardMap styles={styles} selected={selected} onSelect={setSelected} height={560} className="rounded-none border-0" />
        </Panel>
        <Panel title="Ward predictions" actions={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ward or area" className="h-8 w-48" aria-label="Search wards" />} bodyClassName="p-0">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Ward</TableHead><TableHead className="text-right">Risk</TableHead><TableHead>Level</TableHead><TableHead className="text-right">vs now</TableHead><TableHead>Top driver</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((x) => (
                  <TableRow key={x.r.ward} onClick={() => setSelected(x.r.ward)} className={`cursor-pointer ${selected === x.r.ward ? "bg-secondary" : ""}`}>
                    <TableCell className="font-medium">{x.r.ward}<div className="text-xs font-normal text-muted-foreground">{wardByCode(x.r.ward).areas.split(",").slice(0, 2).join(",")}</div></TableCell>
                    <TableCell className="tabular text-right">{fmtPct(x.p)}</TableCell>
                    <TableCell><RiskBadge level={x.level} /></TableCell>
                    <TableCell className="tabular text-right text-xs">
                      <span className={`inline-flex items-center gap-0.5 ${x.delta > 0.02 ? "text-destructive" : x.delta < -0.02 ? "text-primary" : "text-muted-foreground"}`}>
                        {x.delta > 0.02 ? <ArrowUp className="h-3 w-3" /> : x.delta < -0.02 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {Math.abs(Math.round(x.delta * 100))} pts
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">{x.top}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link to="/explainable-ai" className="text-primary underline-offset-4 hover:underline">See why each ward scored this way →</Link>
        <Link to="/notifications" className="text-primary underline-offset-4 hover:underline">Set alert thresholds →</Link>
      </div>
      <SimNote className="mt-6">Predictions come from the interpretable baseline scorer running on simulated data. The STGNN and Spatio-Temporal Transformer are the planned production models and are not trained yet.</SimNote>
    </Page>
  );
}
