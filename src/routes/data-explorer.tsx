import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, SimNote } from "@/components/nexus/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { citySeries, wardSeriesMap, YEARS } from "@/lib/nexus/series";
import { riskHistory } from "@/lib/nexus/risk";
import { WARDS } from "@/lib/nexus/wards";
import { downloadFile, toCSV } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/data-explorer")({
  head: () => pageHead("Data explorer", "Search, filter, sort and download Mumbai ward-level climate, water quality, disease and risk datasets."),
  component: Explorer,
});

type Row = Record<string, string | number>;
const DATASETS: Record<string, { label: string; build: () => Row[]; perWard: boolean }> = {
  climate: {
    label: "City climate & lakes (monthly)", perWard: false,
    build: () => citySeries().map((c) => ({ month: c.key, year: c.year, oni: c.oni, rainfall_mm: c.rainfallMm, rainfall_normal_mm: c.rainfallNormalMm, tmax_c: c.tmax, tmin_c: c.tmin, lake_storage_pct: c.lakeStoragePct, water_cut_pct: c.waterCutPct })),
  },
  water: {
    label: "Ward water quality (monthly)", perWard: true,
    build: () => WARDS.flatMap((w) => wardSeriesMap()[w.code].map((r) => ({ ward: r.ward, month: r.key, year: r.year, unfit_samples_pct: r.unfitPct, residual_chlorine_mgl: r.residualChlorine, turbidity_ntu: r.turbidityNtu, supply_hours: r.supplyHours, scarcity_index: r.scarcityIndex }))),
  },
  disease: {
    label: "Ward disease cases (monthly)", perWard: true,
    build: () => WARDS.flatMap((w) => wardSeriesMap()[w.code].map((r) => ({ ward: r.ward, month: r.key, year: r.year, cholera: r.cholera, typhoid: r.typhoid, rainfall_mm: r.rainfallMm, tmax_c: r.tmax }))),
  },
  risk: {
    label: "Ward risk scores (monthly)", perWard: true,
    build: () => WARDS.flatMap((w) => riskHistory()[w.code].map((r) => ({ ward: r.ward, month: r.month.key, year: r.month.year, cholera_prob: Math.round(r.cholera.prob * 1000) / 1000, typhoid_prob: Math.round(r.typhoid.prob * 1000) / 1000, level: r.level }))),
  },
  wards: {
    label: "Ward profiles (static)", perWard: true,
    build: () => WARDS.map((w) => ({ ward: w.code, areas: w.areas, zone: w.zone, population_2011: w.population, area_km2: w.areaKm2, informal_housing_share: w.slumShare, sewer_coverage: w.sewerCoverage, flood_prone_index: w.floodProne, neighbours: w.neighbors.join(" "), year: 2011 })),
  },
};
const PAGE = 25;

function Explorer() {
  const [ds, setDs] = useState("water");
  const [ward, setWard] = useState("all");
  const [year, setYear] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const all = useMemo(() => DATASETS[ds].build(), [ds]);
  const cols = Object.keys(all[0] ?? {});
  const filtered = useMemo(() => {
    let rows = all.filter((r) => (ward === "all" || r.ward === ward) && (year === "all" || String(r.year) === year));
    if (q) rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase())));
    if (sort) rows = [...rows].sort((a, b) => (a[sort.col] > b[sort.col] ? 1 : a[sort.col] < b[sort.col] ? -1 : 0) * sort.dir);
    return rows;
  }, [all, ward, year, q, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const reset = () => setPage(0);
  const name = `nexus-${ds}${ward !== "all" ? `-${ward.replace("/", "")}` : ""}${year !== "all" ? `-${year}` : ""}`;

  return (
    <Page>
      <PageHeader
        eyebrow="Data · explore"
        title="Data explorer"
        description="Every dataset behind NEXUS, row by row. Filter by ward and year, search any value, sort any column, and download exactly what you see."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadFile(`${name}.csv`, toCSV(filtered))}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="outline" className="gap-2" onClick={() => downloadFile(`${name}.json`, JSON.stringify(filtered, null, 2), "application/json")}><Download className="h-4 w-4" /> JSON</Button>
          </>
        }
      />
      <Panel bodyClassName="p-0"
        title={`${DATASETS[ds].label} · ${filtered.length.toLocaleString("en-IN")} rows`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={ds} onValueChange={(v) => { setDs(v); setSort(null); reset(); }}>
              <SelectTrigger className="h-8 w-[230px] bg-card text-xs" aria-label="Dataset"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DATASETS).map(([k, d]) => <SelectItem key={k} value={k}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={ward} onValueChange={(v) => { setWard(v); reset(); }} disabled={!DATASETS[ds].perWard}>
              <SelectTrigger className="h-8 w-[130px] bg-card text-xs" aria-label="Ward"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All wards</SelectItem>{WARDS.map((w) => <SelectItem key={w.code} value={w.code}>Ward {w.code}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={(v) => { setYear(v); reset(); }} disabled={ds === "wards"}>
              <SelectTrigger className="h-8 w-[110px] bg-card text-xs" aria-label="Year"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All years</SelectItem>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Search values…" className="h-8 w-44 text-xs" aria-label="Search" />
          </div>
        }>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    <button className={sort?.col === c ? "font-semibold text-primary" : ""} onClick={() => setSort((s) => (s?.col === c ? { col: c, dir: s.dir === 1 ? -1 : 1 } : { col: c, dir: 1 }))}>
                      {c}{sort?.col === c ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r, i) => (
                <TableRow key={i}>{cols.map((c) => <TableCell key={c} className={`whitespace-nowrap text-xs ${typeof r[c] === "number" ? "tabular text-right" : ""}`}>{String(r[c])}</TableCell>)}</TableRow>
              ))}
              {shown.length === 0 && <TableRow><TableCell colSpan={cols.length} className="py-10 text-center text-sm text-muted-foreground">No rows match.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>Rows {filtered.length ? page * PAGE + 1 : 0}–{Math.min(filtered.length, (page + 1) * PAGE)} of {filtered.length.toLocaleString("en-IN")}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page + 1} / {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Panel>
      <SimNote className="mt-6">All datasets except ward boundaries and Census population/area are simulated for demonstration. Downloads include the same caveat in their file names' "nexus-" prefix; do not cite them as official data.</SimNote>
    </Page>
  );
}
