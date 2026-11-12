import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CloudRain, Droplets, Gauge, ShieldAlert, Waves } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import heroImg from "@/assets/mumbai-dusk.jpg";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/nexus/Page";
import { Panel, RiskBadge, RiskLegend, SimNote, Stat, VideoEmbed, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { WardMap } from "@/components/nexus/WardMap";
import { currentRisk, forecastRisk, levelCounts, RISK_LEVELS, pick } from "@/lib/nexus/risk";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { LATEST, MONTH_NAMES, citySeries, cityCases } from "@/lib/nexus/series";
import { RISK_HEX } from "@/lib/nexus/palette";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtPct, fmtInt, fmt1 } from "@/lib/nexus/format";
import { useNexus } from "@/lib/nexus/store";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead("Dashboard", "Mumbai-wide cholera and typhoid risk overview, climate statistics, El Niño context and active early-warning alerts."),
  component: Dashboard,
});

function Dashboard() {
  const s = useNexus();
  const now = useMemo(() => currentRisk(), []);
  const next = useMemo(() => forecastRisk(1), []);
  const alerts = useMemo(() => forecastAlerts(s.thresholds), [s.thresholds]);
  const [selected, setSelected] = useState<string>("L");
  const city = citySeries();
  const latest = city[city.length - 1];
  const monsoon = city.filter((c) => c.year === LATEST.year && c.month >= 5 && c.month <= 8);
  const monsoonPct = monsoon.reduce((a, c) => a + c.rainfallMm, 0) / monsoon.reduce((a, c) => a + c.rainfallNormalMm, 0);
  const countsNow = levelCounts(now);
  const countsNext = levelCounts(next);
  const hiNow = countsNow.High + countsNow.Critical;

  const styles = Object.fromEntries(now.map((r) => [r.ward, { fill: RISK_HEX[r.level], tooltip: `<b>Ward ${r.ward}</b> · ${wardByCode(r.ward).areas}<br/>${r.level} · cholera ${fmtPct(r.cholera.prob)} · typhoid ${fmtPct(r.typhoid.prob)}` }]));
  const ranked = [...now].sort((a, b) => b.composite - a.composite);
  const sel = now.find((r) => r.ward === selected)!;

  const climate = city.slice(-24).map((c) => ({ label: `${MONTH_NAMES[c.month]} ${String(c.year).slice(2)}`, rain: c.rainfallMm, normal: c.rainfallNormalMm, lake: c.lakeStoragePct }));
  const cases = city.slice(-24).map((c) => ({ label: `${MONTH_NAMES[c.month]} ${String(c.year).slice(2)}`, ...cityCases(c.idx) }));
  const dist = RISK_LEVELS.map((l) => ({ level: l, now: countsNow[l], next: countsNext[l] }));

  return (
    <>
      <section className="relative isolate overflow-hidden bg-hero text-hero-foreground">
        <img src={heroImg} alt="Mumbai skyline across the sea at dusk" width={1920} height={800} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-hero via-hero/80 to-hero/10" />
        <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pt-16">
          <div className="eyebrow flex items-center gap-2 text-hero-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" /> Mumbai · water, climate & health watch
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">An early read on Mumbai's water-borne risk.</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-hero-foreground/80 sm:text-base">
            NEXUS links El Niño, monsoon rainfall, lake storage and water quality to ward-level cholera and typhoid risk across all 24 MCGM wards — and is clear about what is simulated.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
              <Link to="/heatmap">Open the ward heatmap <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-hero-foreground/40 bg-transparent text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground">
              <Link to="/simulator">Run a what-if scenario</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-hero-foreground/20 pt-4 text-xs text-hero-foreground/70">
            <span>Field notes for a changing climate · data through {LATEST.label}</span>
            <Link to="/el-nino" className="inline-flex items-center gap-1 hover:text-hero-foreground">Read the El Niño context <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-border lg:grid-cols-5 lg:divide-x">
          {[
            { icon: <ShieldAlert className="h-4 w-4" />, label: "Wards at High or Critical", value: `${hiNow} / 24`, sub: `${countsNow.Critical} critical in ${LATEST.label}` },
            { icon: <Gauge className="h-4 w-4" />, label: "Active forecast alerts", value: alerts.length, sub: `For ${next[0].month.label} at your thresholds` },
            { icon: <Waves className="h-4 w-4" />, label: "Oceanic Niño Index", value: `${latest.oni > 0 ? "+" : ""}${fmt1(latest.oni)}`, sub: latest.oni >= 0.5 ? "El Niño conditions" : latest.oni <= -0.5 ? "La Niña conditions" : "Neutral" },
            { icon: <Droplets className="h-4 w-4" />, label: "Lake storage (7 lakes)", value: `${fmt1(latest.lakeStoragePct)}%`, sub: latest.lakeStoragePct < 90 ? "Below full · water cut likely" : "Near full" },
            { icon: <CloudRain className="h-4 w-4" />, label: `${LATEST.year} monsoon vs normal`, value: fmtPct(monsoonPct), sub: "Jun–Sep rainfall, Santacruz normal" },
          ].map((k) => (
            <div key={k.label} className="flex min-w-0 items-start gap-3 border-b border-border px-4 py-4 lg:border-b-0 lg:px-6">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">{k.icon}</div>
              <div className="min-w-0">
                <div className="text-xs leading-tight text-muted-foreground">{k.label}</div>
                <div className="tabular font-serif text-2xl">{k.value}</div>
                <div className="text-[0.7rem] leading-tight text-muted-foreground">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Page>
        <div className="eyebrow text-primary">Mumbai overview</div>
        <h2 className="mt-1 text-3xl">Disease risk by ward</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Composite risk is the higher of cholera and typhoid outbreak probability for {LATEST.label}. Click a ward to see its drivers.</p>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Greater Mumbai · 24 wards" actions={<RiskLegend />} bodyClassName="p-0">
            <WardMap styles={styles} selected={selected} onSelect={setSelected} height={640} className="rounded-none border-0" />
          </Panel>
          <div className="flex flex-col gap-5">
            <Panel eyebrow="Ward detail" title={`Ward ${sel.ward} · ${wardByCode(sel.ward).areas.split(",")[0]}`} actions={<RiskBadge level={sel.level} />}>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Cholera risk</dt><dd className="tabular font-serif text-xl">{fmtPct(sel.cholera.prob)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Typhoid risk</dt><dd className="tabular font-serif text-xl">{fmtPct(sel.typhoid.prob)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Unfit water samples</dt><dd className="tabular">{fmt1(sel.inputs.unfitPct)}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Population</dt><dd className="tabular">{fmtInt(wardByCode(sel.ward).population)}</dd></div>
              </dl>
              <div className="mt-4 text-xs text-muted-foreground">Top drivers</div>
              <ul className="mt-1 space-y-1 text-sm">
                {sel.typhoid.contributions.filter((c) => c.value > 0).slice(0, 3).map((c) => (
                  <li key={c.key} className="flex justify-between gap-2"><span className="truncate">{c.label}</span><span className="tabular text-muted-foreground">+{fmt1(c.value)}</span></li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/explainable-ai">Explain this prediction</Link></Button>
            </Panel>
            <Panel eyebrow="Ranking" title="Highest-risk wards" bodyClassName="p-0">
              <ol className="divide-y divide-border">
                {ranked.slice(0, 6).map((r, i) => (
                  <li key={r.ward}>
                    <button onClick={() => setSelected(r.ward)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted">
                      <span className="tabular w-4 text-xs text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{r.ward} · {wardByCode(r.ward).areas.split(",")[0]}</span>
                      <span className="tabular text-xs">{fmtPct(pick(r, "composite"))}</span>
                      <RiskBadge level={r.level} />
                    </button>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel eyebrow="Climate statistics" title="Rainfall & lake storage, last 24 months" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={climate}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval={2} />
                  <YAxis yAxisId="l" {...axisProps} width={40} />
                  <YAxis yAxisId="r" orientation="right" {...axisProps} width={34} domain={[0, 100]} unit="%" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="rain" name="Rainfall (mm)" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="l" dataKey="normal" name="Normal (mm)" stroke="var(--muted-foreground)" strokeDasharray="4 3" dot={false} />
                  <Line yAxisId="r" dataKey="lake" name="Lake storage (%)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel eyebrow="Distribution" title="Wards by risk level">
            <div className="space-y-3">
              {dist.map((d) => (
                <div key={d.level}>
                  <div className="mb-1 flex items-center justify-between text-xs"><RiskBadge level={d.level} /><span className="tabular text-muted-foreground">{d.now} now → {d.next} next month</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(d.now / 24) * 100}%`, background: RISK_HEX[d.level] }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Next month ({next[0].month.label}) uses projected drivers: post-monsoon lake deficit, expected water cuts and the ONI path.</p>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel eyebrow="Active alerts" title={`Forecast alerts · ${next[0].month.label}`} actions={<Button asChild variant="ghost" size="sm"><Link to="/alerts">Manage</Link></Button>} bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <RiskBadge level={a.level} />
                  <span className="min-w-0 flex-1 truncate">Ward {a.ward} · <span className="capitalize">{a.disease}</span></span>
                  <span className="tabular text-xs text-muted-foreground">{fmtPct(a.prob)}</span>
                </li>
              ))}
              {alerts.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No wards above your thresholds.</li>}
            </ul>
          </Panel>
          <Panel eyebrow="Surveillance" title="Reported cases, last 24 months" className="lg:col-span-2">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={cases}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval={2} />
                  <YAxis {...axisProps} width={36} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="typhoid" name="Typhoid" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                  <Line dataKey="cholera" name="Cholera" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel eyebrow="Explainer" title="What El Niño means for Mumbai" bodyClassName="p-0">
            <VideoEmbed src="https://www.youtube.com/embed/57S0Rw9L_hw" title="El Niño explained" />
          </Panel>
          <Panel eyebrow="Why it matters" title="From Pacific warming to ward taps">
            <ol className="space-y-3 text-sm leading-relaxed">
              {[
                "El Niño tends to weaken the Indian summer monsoon.",
                "A weak monsoon leaves Mumbai's seven supply lakes short of full by October.",
                "BMC then cuts supply; intermittent pipes lose pressure and draw in contaminated water.",
                "Stored water and leaky lines raise cholera and typhoid risk — most in dense, low-sewerage wards.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3"><span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{i + 1}</span><span>{t}</span></li>
              ))}
            </ol>
            <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/el-nino">Open the El Niño explainer</Link></Button>
          </Panel>
        </div>

        <SimNote className="mt-6">
          All climate, water and case figures on this page are simulated demo data generated for Mumbai's 24 wards (ONI approximated from NOAA CPC). Risk scores come from an interpretable baseline model, not a trained STGNN/Transformer. Ward boundaries are real (MCGM via Datameet).
        </SimNote>
      </Page>
    </>
  );
}
