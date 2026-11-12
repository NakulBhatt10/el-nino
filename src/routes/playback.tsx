import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Area, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskLegend, Segmented, SimNote, Stat, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { categorize, levelCounts, pick, riskAt, type RiskTarget } from "@/lib/nexus/risk";
import { cityCases, citySeries, MONTHS, MONTH_NAMES, LATEST } from "@/lib/nexus/series";
import { RISK_HEX } from "@/lib/nexus/palette";
import { fmt1, fmtInt, fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/playback")({
  head: () => pageHead("Historical playback", "Scrub through 2015–2026 to see how Mumbai's climate, El Niño and ward disease risk changed month by month."),
  component: Playback,
});

function Playback() {
  const [idx, setIdx] = useState(MONTHS.findIndex((m) => m.key === "2015-08"));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<"1" | "2" | "4">("1");
  const [target, setTarget] = useState<RiskTarget>("composite");
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i >= LATEST.idx ? (setPlaying(false), i) : i + 1)), 900 / Number(speed));
    return () => clearInterval(t);
  }, [playing, speed]);

  const rows = riskAt(idx);
  const c = citySeries()[idx];
  const k = cityCases(idx);
  const counts = levelCounts(rows, target);
  const styles = Object.fromEntries(rows.map((r) => [r.ward, { fill: RISK_HEX[categorize(pick(r, target))], tooltip: `<b>Ward ${r.ward}</b> · ${MONTHS[idx].label}<br/>${fmtPct(pick(r, target))} ${categorize(pick(r, target))}` }]));
  const timeline = useMemo(() => citySeries().map((m) => {
    const rr = riskAt(m.idx);
    return { idx: m.idx, label: `${MONTH_NAMES[m.month]} ${String(m.year).slice(2)}`, oni: m.oni, hi: rr.filter((r) => r.level === "High" || r.level === "Critical").length, lake: m.lakeStoragePct };
  }), []);
  const events: Record<string, string> = {
    "2015-08": "Strong El Niño builds; monsoon falls short and BMC prepares water cuts.",
    "2016-05": "Lakes near dead storage after the 2015 deficit; deep cuts in force.",
    "2019-07": "Record July rainfall floods low-lying wards.",
    "2020-10": "La Niña sets in; lakes full after back-to-back wet monsoons.",
    "2023-09": "El Niño returns; ONI passes +1.5.",
    "2026-10": "Simulated 2026 El Niño: lakes end the monsoon below 70%.",
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Analysis · time travel"
        title="Historical playback"
        description="Scrub or play through every month since January 2015. The map, counters and timeline move together so you can see El Niño years, floods and water cuts ripple through ward risk."
        actions={<Segmented value={target} onChange={setTarget} options={[{ value: "composite", label: "Composite" }, { value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />}
      />
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} aria-label="Previous month"><SkipBack className="h-4 w-4" /></Button>
          <Button size="icon" onClick={() => { if (idx >= LATEST.idx) setIdx(0); setPlaying((p) => !p); }} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
          <Button size="icon" variant="outline" onClick={() => setIdx((i) => Math.min(LATEST.idx, i + 1))} aria-label="Next month"><SkipForward className="h-4 w-4" /></Button>
          <div className="min-w-[110px] font-serif text-2xl tabular">{MONTHS[idx].label}</div>
          <Slider className="min-w-[200px] flex-1" value={[idx]} min={0} max={LATEST.idx} step={1} onValueChange={([v]) => setIdx(v)} aria-label="Timeline" />
          <Segmented value={speed} onChange={setSpeed} options={[{ value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "4", label: "4×" }]} />
        </div>
        {events[MONTHS[idx].key] && <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">{events[MONTHS[idx].key]}</div>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(events).map(([key, txt]) => (
            <button key={key} onClick={() => { setPlaying(false); setIdx(MONTHS.findIndex((m) => m.key === key)); }} className="rounded border border-border px-2 py-1 text-muted-foreground hover:border-primary hover:text-primary" title={txt}>{MONTHS.find((m) => m.key === key)!.label}</button>
          ))}
        </div>
      </Panel>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="High + Critical wards" value={counts.High + counts.Critical} tone={counts.Critical > 5 ? "danger" : "default"} />
        <Stat label="Rainfall" value={`${fmtInt(c.rainfallMm)} mm`} sub={`Normal ${fmtInt(c.rainfallNormalMm)} mm`} />
        <Stat label="ONI" value={`${c.oni > 0 ? "+" : ""}${fmt1(c.oni)}`} sub={c.oni >= 0.5 ? "El Niño" : c.oni <= -0.5 ? "La Niña" : "Neutral"} />
        <Stat label="Lake storage" value={`${fmt1(c.lakeStoragePct)}%`} sub={c.waterCutPct ? `${c.waterCutPct}% water cut` : "No cut"} />
        <Stat label="Cases (typhoid / cholera)" value={`${fmtInt(k.typhoid)} / ${fmtInt(k.cholera)}`} />
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={`${target === "composite" ? "Composite" : target} risk · ${MONTHS[idx].label}`} actions={<RiskLegend />} bodyClassName="p-0">
          <WardMap styles={styles} height={520} className="rounded-none border-0" />
        </Panel>
        <Panel eyebrow="Timeline" title="High-risk wards, ONI and lake storage">
          <div className="h-[460px]">
            <ResponsiveContainer>
              <ComposedChart data={timeline} onClick={(e) => { if (e && typeof e.activeTooltipIndex === "number") { setPlaying(false); setIdx(e.activeTooltipIndex); } }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={11} />
                <YAxis yAxisId="w" {...axisProps} width={28} domain={[0, 24]} />
                <YAxis yAxisId="p" orientation="right" {...axisProps} width={34} domain={[0, 100]} unit="%" />
                <YAxis yAxisId="o" hide domain={[-3, 3]} />
                <Tooltip {...tooltipStyle} />
                <Area yAxisId="p" dataKey="lake" name="Lake storage %" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} />
                <Line yAxisId="w" dataKey="hi" name="High+Critical wards" stroke="var(--risk-critical)" strokeWidth={2} dot={false} />
                <Line yAxisId="o" dataKey="oni" name="ONI" stroke="var(--chart-2)" strokeWidth={1.5} dot={false} />
                <ReferenceLine yAxisId="w" x={timeline[idx].label} stroke="var(--primary)" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">Click anywhere on the chart to jump to that month.</p>
        </Panel>
      </div>
      <SimNote className="mt-6">History is simulated (ONI approximated from NOAA CPC). Event notes describe the broad pattern of those years, not exact records.</SimNote>
    </Page>
  );
}
