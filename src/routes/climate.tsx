import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat, WardSelect, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { citySeries, MONTH_NAMES, RAIN_NORMAL, wardSeries, YEARS, LATEST } from "@/lib/nexus/series";
import { fmt1, fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";
import { CloudRain, Thermometer, Waves, Droplets } from "lucide-react";

export const Route = createFileRoute("/climate")({
  head: () => pageHead("Climate monitoring", "Mumbai rainfall, temperature, Oceanic Niño Index and historical monsoon trends by ward."),
  component: Climate,
});

function Climate() {
  const [ward, setWard] = useState("city");
  const [from, setFrom] = useState("2021");
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const city = citySeries();
  const series = useMemo(() => {
    const ws = ward === "city" ? null : wardSeries(ward);
    return city.map((c, i) => ({
      label: `${MONTH_NAMES[c.month]} ${String(c.year).slice(2)}`, year: c.year, month: c.month,
      rain: ws ? ws[i].rainfallMm : c.rainfallMm, normal: c.rainfallNormalMm,
      tmax: ws ? ws[i].tmax : c.tmax, tmin: c.tmin, oni: c.oni, lake: c.lakeStoragePct,
    }));
  }, [ward, city]);
  const visible = series.filter((r) => r.year >= Number(from));
  const annual = YEARS.map((y) => {
    const rows = series.filter((r) => r.year === y);
    const jjas = rows.filter((r) => r.month >= 5 && r.month <= 8);
    const oniJJAS = jjas.reduce((s, r) => s + r.oni, 0) / (jjas.length || 1);
    const rain = jjas.reduce((s, r) => s + r.rain, 0);
    const normal = RAIN_NORMAL.slice(5, 9).reduce((a, b) => a + b, 0);
    return { year: String(y), rain: Math.round(rain), anomaly: Math.round(((rain - normal) / normal) * 100), oni: Math.round(oniJJAS * 10) / 10, tmax: Math.round((rows.reduce((s, r) => s + r.tmax, 0) / rows.length) * 10) / 10 };
  });
  const last = series[series.length - 1];
  const yr = annual[annual.length - 1];

  return (
    <Page>
      <PageHeader
        eyebrow="Monitoring · IMD-style series"
        title="Climate monitoring"
        description="Monsoon rainfall, temperature and the Oceanic Niño Index (ONI) that signals El Niño. Compare any ward against the Santacruz rainfall normal."
        actions={
          <>
            <WardSelect value={ward} onChange={setWard} includeCity />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-9 w-[130px] bg-card" aria-label="From year"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.slice(0, -1).map((y) => <SelectItem key={y} value={String(y)}>From {y}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<CloudRain className="h-4 w-4" />} label={`${LATEST.year} monsoon (Jun–Sep)`} value={`${fmtInt(yr.rain)} mm`} sub={`${yr.anomaly > 0 ? "+" : ""}${yr.anomaly}% vs normal`} tone={yr.anomaly < -15 ? "danger" : "default"} />
        <Stat icon={<Thermometer className="h-4 w-4" />} label={`Max temp · ${LATEST.label}`} value={`${fmt1(last.tmax)}°C`} sub={`Normal ${fmt1(33)}°C`} />
        <Stat icon={<Waves className="h-4 w-4" />} label="ONI (latest)" value={`${last.oni > 0 ? "+" : ""}${fmt1(last.oni)}`} sub={last.oni >= 0.5 ? "El Niño threshold crossed" : "Neutral"} tone={last.oni >= 1 ? "warn" : "default"} />
        <Stat icon={<Droplets className="h-4 w-4" />} label="Lake storage" value={`${fmt1(last.lake)}%`} sub="Upper Vaitarna, Bhatsa, Tansa + 4" />
      </div>

      <Panel className="mt-5" eyebrow="Rainfall" title={ward === "city" ? "Mumbai rainfall" : `Ward ${ward} rainfall`} actions={<Segmented value={view} onChange={setView} options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Monsoon totals" }]} />}>
        <div className="h-72">
          <ResponsiveContainer>
            {view === "monthly" ? (
              <ComposedChart data={visible}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={Math.ceil(visible.length / 14)} />
                <YAxis {...axisProps} width={44} unit="" />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="rain" name="Rainfall (mm)" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
                <Line dataKey="normal" name="Normal (mm)" stroke="var(--muted-foreground)" strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            ) : (
              <ComposedChart data={annual}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis yAxisId="l" {...axisProps} width={48} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} width={36} domain={[-2, 3]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="rain" name="Jun–Sep rainfall (mm)" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
                <Line yAxisId="r" dataKey="oni" name="Mean ONI (Jun–Sep)" stroke="var(--chart-4)" strokeWidth={2} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="ENSO" title="Oceanic Niño Index">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={visible}>
                <defs>
                  <linearGradient id="oniFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--risk-critical)" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="var(--muted)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={Math.ceil(visible.length / 10)} />
                <YAxis {...axisProps} width={32} domain={[-2, 3]} />
                <Tooltip {...tooltipStyle} />
                <ReferenceLine y={0.5} stroke="var(--risk-high)" strokeDasharray="4 3" label={{ value: "El Niño +0.5", fontSize: 10, fill: "var(--muted-foreground)", position: "insideTopLeft" }} />
                <ReferenceLine y={-0.5} stroke="var(--chart-3)" strokeDasharray="4 3" label={{ value: "La Niña −0.5", fontSize: 10, fill: "var(--muted-foreground)", position: "insideBottomLeft" }} />
                <Area dataKey="oni" name="ONI" stroke="var(--chart-4)" fill="url(#oniFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Temperature" title="Monthly maximum & minimum (°C)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={visible}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={Math.ceil(visible.length / 10)} />
                <YAxis {...axisProps} width={32} domain={[15, 38]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="tmax" name="Max" stroke="var(--chart-4)" dot={false} strokeWidth={2} />
                <Line dataKey="tmin" name="Min (city)" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="mt-5" eyebrow="Historical trend" title="Monsoon anomaly by year (%)">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={annual}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} width={36} unit="%" />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Bar dataKey="anomaly" name="Anomaly vs normal" radius={[2, 2, 0, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Deficit years ({annual.filter((a) => a.anomaly < -15).map((a) => a.year).join(", ")}) coincide with El Niño onsets. Correlation of monsoon rainfall with mean Jun–Sep ONI: {fmtPct(Math.abs(corr(annual.map((a) => a.rain), annual.map((a) => a.oni))))} (negative).</p>
      </Panel>
      <SimNote className="mt-6">Rainfall normals follow the Santacruz observatory pattern; ONI approximates NOAA CPC values with 2025–26 simulated. Monthly ward rainfall and temperatures are simulated.</SimNote>
    </Page>
  );
}

function corr(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
  let n = 0, da = 0, db = 0;
  a.forEach((v, i) => { n += (v - ma) * (b[i] - mb); da += (v - ma) ** 2; db += (b[i] - mb) ** 2; });
  return n / Math.sqrt(da * db);
}
