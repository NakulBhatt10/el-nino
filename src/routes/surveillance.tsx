import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cityCases, citySeries, MONTH_NAMES, wardSeriesMap, YEARS } from "@/lib/nexus/series";
import { WARDS, wardByCode } from "@/lib/nexus/wards";
import { seasonalProfile } from "@/lib/nexus/analytics";
import { rampHex } from "@/lib/nexus/palette";
import { fmt1, fmtInt } from "@/lib/nexus/format";
import type { Disease } from "@/lib/nexus/risk";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/surveillance")({
  head: () => pageHead("Disease surveillance", "Historical cholera and typhoid cases across Mumbai's 24 wards: trends, seasonality and incidence per 100,000."),
  component: Surveillance,
});

function Surveillance() {
  const [disease, setDisease] = useState<Disease>("typhoid");
  const [year, setYear] = useState(String(YEARS[YEARS.length - 1]));
  const [ward, setWard] = useState<string | null>(null);
  const y = Number(year);
  const byWard = useMemo(() => WARDS.map((w) => {
    const rows = wardSeriesMap()[w.code].filter((r) => r.year === y);
    const cholera = rows.reduce((s, r) => s + r.cholera, 0), typhoid = rows.reduce((s, r) => s + r.typhoid, 0);
    const n = disease === "cholera" ? cholera : typhoid;
    return { ward: w.code, cholera, typhoid, per100k: (n / w.population) * 100000 };
  }), [y, disease]);
  const prevYear = WARDS.reduce((s, w) => s + wardSeriesMap()[w.code].filter((r) => r.year === y - 1).reduce((a, r) => a + r[disease], 0), 0);
  const total = byWard.reduce((s, r) => s + r[disease], 0);
  const monthly = citySeries().filter((c) => c.year >= y - 2 && c.year <= y).map((c) => {
    const k = ward ? { cholera: wardSeriesMap()[ward][c.idx].cholera, typhoid: wardSeriesMap()[ward][c.idx].typhoid } : cityCases(c.idx);
    return { label: `${MONTH_NAMES[c.month]} ${String(c.year).slice(2)}`, ...k };
  });
  const annual = YEARS.map((yy) => {
    let ch = 0, ty = 0;
    for (const w of WARDS) for (const r of wardSeriesMap()[w.code]) if (r.year === yy && (!ward || r.ward === ward)) { ch += r.cholera; ty += r.typhoid; }
    return { year: String(yy), cholera: ch, typhoid: ty };
  });
  const season = seasonalProfile(ward ?? "city", disease);
  const maxRate = Math.max(...byWard.map((r) => r.per100k));
  const styles = Object.fromEntries(byWard.map((r) => [r.ward, { fill: rampHex(r.per100k / maxRate), tooltip: `<b>Ward ${r.ward}</b><br/>${disease}: ${fmtInt(r[disease])} cases in ${y}<br/>${fmt1(r.per100k)} per 100k` }]));
  const peak = season.reduce((a, b) => (b.avg > a.avg ? b : a));

  return (
    <Page>
      <PageHeader
        eyebrow="Monitoring · cases"
        title="Disease surveillance"
        description="Reported cholera and typhoid cases by ward and month. Click a ward on the map to filter the trend charts; click again to return to city totals."
        actions={
          <>
            <Segmented value={disease} onChange={setDisease} options={[{ value: "typhoid", label: "Typhoid" }, { value: "cholera", label: "Cholera" }]} />
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-[110px] bg-card" aria-label="Year"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((yy) => <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`${disease === "cholera" ? "Cholera" : "Typhoid"} cases · ${y}`} value={fmtInt(total)} sub={y === 2026 ? "Jan–Oct" : "Full year"} />
        <Stat label="Change vs previous year" value={prevYear ? `${total >= prevYear ? "+" : ""}${Math.round(((total - prevYear) / prevYear) * 100)}%` : "—"} sub={`${fmtInt(prevYear)} in ${y - 1}`} />
        <Stat label="Highest incidence" value={[...byWard].sort((a, b) => b.per100k - a.per100k)[0].ward} sub={`${fmt1(maxRate)} per 100k`} tone="warn" />
        <Stat label="Seasonal peak month" value={peak.month} sub={ward ? `Ward ${ward}` : "City average 2015–26"} />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel eyebrow={`Incidence per 100k · ${y}`} title="Cases by ward" bodyClassName="p-0">
          <WardMap styles={styles} selected={ward} onSelect={(c) => setWard((w) => (w === c ? null : c))} height={480} className="rounded-none border-0" />
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel eyebrow={ward ? `Ward ${ward}` : "All Mumbai"} title={`Monthly cases, ${y - 2}–${y}`}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval={3} />
                  <YAxis {...axisProps} width={36} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="typhoid" name="Typhoid" stackId="a" fill="var(--chart-4)" />
                  <Bar dataKey="cholera" name="Cholera" stackId="a" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel eyebrow="Seasonality" title={`Average ${disease} cases by calendar month`}>
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={season}>
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} width={30} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => fmt1(v)} />
                  <Bar dataKey="avg" name="Average cases" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel eyebrow="History" title="Annual cases 2015–2026">
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={annual}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis yAxisId="l" {...axisProps} width={44} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} width={36} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="l" dataKey="typhoid" name="Typhoid" stroke="var(--chart-4)" strokeWidth={2} />
                <Line yAxisId="r" dataKey="cholera" name="Cholera (right)" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow={`${y}`} title="Ward case table" bodyClassName="p-0">
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Ward</TableHead><TableHead className="text-right">Cholera</TableHead><TableHead className="text-right">Typhoid</TableHead><TableHead className="text-right">{disease} /100k</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...byWard].sort((a, b) => b.per100k - a.per100k).map((r) => (
                  <TableRow key={r.ward} className={`cursor-pointer ${ward === r.ward ? "bg-secondary" : ""}`} onClick={() => setWard(r.ward)}>
                    <TableCell>{r.ward} <span className="text-muted-foreground">· {wardByCode(r.ward).areas.split(",")[0]}</span></TableCell>
                    <TableCell className="tabular text-right">{fmtInt(r.cholera)}</TableCell>
                    <TableCell className="tabular text-right">{fmtInt(r.typhoid)}</TableCell>
                    <TableCell className="tabular text-right">{fmt1(r.per100k)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
      <SimNote className="mt-6">Case counts are simulated from climate, water and ward vulnerability drivers. Real reporting would come from MCGM's Epidemiology Cell monsoon reports and IDSP; these figures are not official statistics.</SimNote>
    </Page>
  );
}
