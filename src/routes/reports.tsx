import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat, WardSelect, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { Button } from "@/components/ui/button";
import { currentRisk, forecastRisk, levelCounts, RISK_LEVELS } from "@/lib/nexus/risk";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { cityCases, citySeries, LATEST, YEARS } from "@/lib/nexus/series";
import { RISK_HEX } from "@/lib/nexus/palette";
import { WARDS, wardByCode } from "@/lib/nexus/wards";
import { useNexus } from "@/lib/nexus/store";
import { downloadFile, fmtInt, fmtPct, toCSV } from "@/lib/nexus/format";
import { generateReport, type ReportKind } from "@/lib/nexus/pdf";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/reports")({
  head: () => pageHead("Reports & analytics", "Visual summaries and downloadable PDF, CSV and printable reports on Mumbai ward disease risk."),
  component: Reports,
});

function Reports() {
  const s = useNexus();
  const [ward, setWard] = useState("L");
  const [period, setPeriod] = useState<"0" | "1">("0");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = useMemo(() => (period === "0" ? currentRisk() : forecastRisk(1)), [period]);
  const counts = levelCounts(rows);
  const alerts = forecastAlerts(s.thresholds);
  const pie = RISK_LEVELS.map((l) => ({ name: l, value: counts[l] }));
  const zones = ["Island City", "Western Suburbs", "Eastern Suburbs"].map((z) => {
    const zr = rows.filter((r) => wardByCode(r.ward).zone === z);
    return { zone: z, cholera: Math.round((zr.reduce((a, r) => a + r.cholera.prob, 0) / zr.length) * 100), typhoid: Math.round((zr.reduce((a, r) => a + r.typhoid.prob, 0) / zr.length) * 100) };
  });
  const annual = YEARS.map((y) => {
    const ms = citySeries().filter((c) => c.year === y);
    const k = ms.reduce((acc, c) => { const x = cityCases(c.idx); return { cholera: acc.cholera + x.cholera, typhoid: acc.typhoid + x.typhoid }; }, { cholera: 0, typhoid: 0 });
    return { year: String(y), ...k };
  });

  const pdf = async (kind: ReportKind) => {
    setBusy(kind);
    try {
      await generateReport(kind, { ward, horizon: Number(period), thresholds: s.thresholds });
      toast.success("PDF report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the PDF. Try again.");
    } finally {
      setBusy(null);
    }
  };
  const csv = () => downloadFile(`nexus-ward-risk-${rows[0].month.key}.csv`, toCSV(rows.map((r) => ({ ward: r.ward, areas: wardByCode(r.ward).areas, zone: wardByCode(r.ward).zone, month: r.month.key, cholera_prob: r.cholera.prob.toFixed(3), typhoid_prob: r.typhoid.prob.toFixed(3), level: r.level }))));

  const reports: { kind: ReportKind; title: string; desc: string }[] = [
    { kind: "city", title: "Citywide risk bulletin", desc: "KPIs, ward risk chart and full ward table." },
    { kind: "ward", title: `Ward ${ward} report`, desc: "Driver attribution and action plan for one ward." },
    { kind: "alerts", title: "Alert summary", desc: "All alerts at your current thresholds with first actions." },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Data · reporting"
        title="Reports & analytics"
        description="Visual summaries for briefings, plus PDF, CSV and print-ready versions to share with ward offices."
        actions={
          <>
            <Segmented value={period} onChange={setPeriod} options={[{ value: "0", label: `Observed ${LATEST.label}` }, { value: "1", label: `Forecast ${forecastRisk(1)[0].month.label}` }]} />
            <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3" data-print-hide>
        {reports.map((r) => (
          <div key={r.kind} className="flex flex-col rounded-md border border-border bg-card p-4">
            <FileText className="h-5 w-5 text-primary" />
            <div className="mt-2 font-serif text-lg">{r.title}</div>
            <p className="flex-1 text-xs text-muted-foreground">{r.desc}</p>
            {r.kind === "ward" && <WardSelect value={ward} onChange={setWard} className="mt-3 w-full" />}
            <Button className="mt-3 gap-2" onClick={() => pdf(r.kind)} disabled={busy !== null}><Download className="h-4 w-4" /> {busy === r.kind ? "Building…" : "Download PDF"}</Button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Wards High or Critical" value={counts.High + counts.Critical} sub={rows[0].month.label} />
        <Stat label="Residents in those wards" value={`${(rows.filter((r) => r.level === "High" || r.level === "Critical").reduce((a, r) => a + wardByCode(r.ward).population, 0) / 1e6).toFixed(1)}M`} />
        <Stat label="Forecast alerts" value={alerts.length} />
        <Stat label={`Typhoid cases ${LATEST.year}`} value={fmtInt(annual[annual.length - 1].typhoid)} sub="Jan–Oct" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel eyebrow="Summary" title="Risk level mix">
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pie.map((p) => <Cell key={p.name} fill={RISK_HEX[p.name as keyof typeof RISK_HEX]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="By zone" title="Mean risk by region (%)" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={zones}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="zone" {...axisProps} />
                <YAxis {...axisProps} width={30} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="cholera" name="Cholera" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="typhoid" name="Typhoid" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel eyebrow="Trend" title="Annual cases 2015–2026">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={annual}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis {...axisProps} width={40} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="typhoid" name="Typhoid" stroke="var(--chart-4)" strokeWidth={2} />
                <Line dataKey="cholera" name="Cholera" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Table" title={`Ward risk · ${rows[0].month.label}`} actions={<Button size="sm" variant="outline" onClick={csv} data-print-hide>CSV</Button>} bodyClassName="p-0">
          <div className="max-h-[260px] overflow-auto print:max-h-none">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Ward</th><th className="px-4 py-2 text-right font-medium">Cholera</th><th className="px-4 py-2 text-right font-medium">Typhoid</th><th className="px-4 py-2 font-medium">Level</th></tr></thead>
              <tbody>
                {[...rows].sort((a, b) => b.composite - a.composite).map((r) => (
                  <tr key={r.ward} className="border-b border-border last:border-0"><td className="px-4 py-1.5">{r.ward} <span className="text-xs text-muted-foreground">· {wardByCode(r.ward).areas.split(",")[0]}</span></td><td className="tabular px-4 py-1.5 text-right">{fmtPct(r.cholera.prob)}</td><td className="tabular px-4 py-1.5 text-right">{fmtPct(r.typhoid.prob)}</td><td className="px-4 py-1.5 text-xs">{r.level}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <SimNote className="mt-6">Reports carry a "simulated data" notice on every page. {WARDS.length} wards included.</SimNote>
    </Page>
  );
}
