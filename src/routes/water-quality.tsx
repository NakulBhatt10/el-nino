import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Droplets, FlaskConical, Gauge, Timer } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, SimNote, Stat, WardSelect, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { citySeries, LATEST, MONTH_NAMES, wardSeries, wardSeriesMap } from "@/lib/nexus/series";
import { WARDS, wardByCode } from "@/lib/nexus/wards";
import { rampHex } from "@/lib/nexus/palette";
import { fmt1 } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/water-quality")({
  head: () => pageHead("Water quality monitoring", "Ward-level water contamination, residual chlorine, supply hours, lake storage and scarcity across Mumbai."),
  component: WaterQuality,
});

type SortKey = "unfitPct" | "residualChlorine" | "supplyHours" | "scarcityIndex" | "turbidityNtu";

function WaterQuality() {
  const [ward, setWard] = useState("L");
  const [sort, setSort] = useState<SortKey>("unfitPct");
  const ws = wardSeries(ward).slice(-24).map((r) => ({ ...r, lbl: `${MONTH_NAMES[r.month]} ${String(r.year).slice(2)}` }));
  const city = citySeries().slice(-36).map((c) => ({ lbl: `${MONTH_NAMES[c.month]} ${String(c.year).slice(2)}`, lake: c.lakeStoragePct, cut: c.waterCutPct }));
  const latest = useMemo(() => WARDS.map((w) => wardSeriesMap()[w.code][LATEST.idx]), []);
  const cityLatest = citySeries()[LATEST.idx];
  const avgUnfit = latest.reduce((s, r) => s + r.unfitPct, 0) / latest.length;
  const avgSupply = latest.reduce((s, r) => s + r.supplyHours, 0) / latest.length;
  const sorted = [...latest].sort((a, b) => (sort === "residualChlorine" || sort === "supplyHours" ? a[sort] - b[sort] : b[sort] - a[sort]));
  const maxUnfit = Math.max(...latest.map((r) => r.unfitPct));
  const styles = Object.fromEntries(latest.map((r) => [r.ward, { fill: rampHex(r.unfitPct / maxUnfit), tooltip: `<b>Ward ${r.ward}</b><br/>Unfit samples ${fmt1(r.unfitPct)}% · Cl ${r.residualChlorine} mg/L<br/>Supply ${fmt1(r.supplyHours)} h/day` }]));
  const scarcity = [...latest].sort((a, b) => b.scarcityIndex - a.scarcityIndex).map((r) => ({ ward: r.ward, scarcity: Math.round(r.scarcityIndex * 100) / 10, supply: r.supplyHours }));
  const cur = ws[ws.length - 1];

  return (
    <Page>
      <PageHeader
        eyebrow="Monitoring · water"
        title="Water quality monitoring"
        description="Contamination (share of samples unfit for drinking), residual chlorine, turbidity, daily supply hours and the lake storage that drives water cuts."
        actions={<WardSelect value={ward} onChange={setWard} />}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<FlaskConical className="h-4 w-4" />} label="City mean unfit samples" value={`${fmt1(avgUnfit)}%`} sub={LATEST.label} tone={avgUnfit > 4 ? "warn" : "default"} />
        <Stat icon={<Droplets className="h-4 w-4" />} label="Lake storage" value={`${fmt1(cityLatest.lakeStoragePct)}%`} sub={cityLatest.lakeStoragePct < 90 ? "Below full at end of monsoon" : "Near full"} />
        <Stat icon={<Timer className="h-4 w-4" />} label="Mean supply" value={`${fmt1(avgSupply)} h/day`} sub="Across 24 wards" />
        <Stat icon={<Gauge className="h-4 w-4" />} label={`Ward ${ward} residual chlorine`} value={`${cur.residualChlorine} mg/L`} sub={cur.residualChlorine < 0.2 ? "Below 0.2 mg/L target" : "Meets 0.2 mg/L target"} tone={cur.residualChlorine < 0.2 ? "danger" : "default"} />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel eyebrow="Contamination map" title={`Unfit samples · ${LATEST.label}`} bodyClassName="p-0">
          <WardMap styles={styles} selected={ward} onSelect={setWard} height={460} className="rounded-none border-0" />
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel eyebrow={`Ward ${ward}`} title="Contamination & chlorine, 24 months">
            <div className="h-52">
              <ResponsiveContainer>
                <ComposedChart data={ws}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="lbl" {...axisProps} interval={3} />
                  <YAxis yAxisId="l" {...axisProps} width={30} unit="%" />
                  <YAxis yAxisId="r" orientation="right" {...axisProps} width={34} domain={[0, 1]} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="unfitPct" name="Unfit samples (%)" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="r" dataKey="residualChlorine" name="Residual Cl (mg/L)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <ReferenceLine yAxisId="r" y={0.2} stroke="var(--risk-critical)" strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel eyebrow={`Ward ${ward}`} title="Supply hours & turbidity">
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={ws}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="lbl" {...axisProps} interval={3} />
                  <YAxis {...axisProps} width={30} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="supplyHours" name="Supply (h/day)" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  <Line dataKey="turbidityNtu" name="Turbidity (NTU)" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Availability" title="Lake storage & water cuts, 36 months">
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={city}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="lbl" {...axisProps} interval={4} />
                <YAxis {...axisProps} width={34} unit="%" domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="lake" name="Lake storage (%)" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
                <Area dataKey="cut" name="Water cut (%)" stroke="var(--risk-critical)" fill="var(--risk-critical)" fillOpacity={0.2} type="step" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Scarcity" title="Water scarcity index by ward (0–10)">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={scarcity}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="ward" {...axisProps} interval={0} fontSize={9} />
                <YAxis {...axisProps} width={28} domain={[0, 10]} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="scarcity" name="Scarcity index" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="mt-5" eyebrow="All wards" title={`Water indicators · ${LATEST.label}`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward</TableHead>
                {([["unfitPct", "Unfit samples"], ["residualChlorine", "Residual Cl"], ["turbidityNtu", "Turbidity"], ["supplyHours", "Supply h/day"], ["scarcityIndex", "Scarcity"]] as [SortKey, string][]).map(([k, l]) => (
                  <TableHead key={k} className="text-right">
                    <button onClick={() => setSort(k)} className={sort === k ? "font-semibold text-primary" : ""}>{l}{sort === k ? " ↓" : ""}</button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.ward} className={`cursor-pointer ${r.ward === ward ? "bg-secondary" : ""}`} onClick={() => setWard(r.ward)}>
                  <TableCell className="font-medium">{r.ward} <span className="font-normal text-muted-foreground">· {wardByCode(r.ward).areas.split(",")[0]}</span></TableCell>
                  <TableCell className="tabular text-right">{fmt1(r.unfitPct)}%</TableCell>
                  <TableCell className={`tabular text-right ${r.residualChlorine < 0.2 ? "text-destructive" : ""}`}>{r.residualChlorine}</TableCell>
                  <TableCell className="tabular text-right">{fmt1(r.turbidityNtu)}</TableCell>
                  <TableCell className="tabular text-right">{fmt1(r.supplyHours)}</TableCell>
                  <TableCell className="tabular text-right">{fmt1(r.scarcityIndex * 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <SimNote className="mt-6">Ward water indicators are simulated. In production these would come from MCGM Hydraulic Engineer's lab results and CPCB/MPCB monitoring; lake storage follows the 7-lake system's seasonal cycle.</SimNote>
    </Page>
  );
}
