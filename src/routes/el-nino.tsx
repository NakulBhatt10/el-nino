import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { ArrowRight } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, SimNote, VideoEmbed, axisProps, tooltipStyle } from "@/components/nexus/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { citySeries, RAIN_NORMAL, YEARS, LATEST } from "@/lib/nexus/series";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/el-nino")({
  head: () => pageHead("El Niño explainer", "How El Niño weakens the monsoon, drains Mumbai's lakes and raises cholera and typhoid risk — with video and data."),
  component: ElNino,
});

const CHAIN = [
  { t: "Pacific warms", d: "Sea-surface temperatures in the central-east Pacific rise ≥0.5 °C above normal for several seasons (ONI ≥ +0.5)." },
  { t: "Monsoon weakens", d: "The Walker circulation shifts; sinking air over India suppresses rainfall. Many of India's worst droughts have been El Niño years." },
  { t: "Lakes fall short", d: "Mumbai draws ~3,900 million litres a day from seven lakes that must refill in four monsoon months." },
  { t: "Water cuts", d: "When lakes aren't near full by October, BMC typically announces 10–20% cuts that last until the next monsoon." },
  { t: "Contamination", d: "Intermittent supply drops pipe pressure; sewage can seep into leaky mains. People store water longer, often uncovered." },
  { t: "Disease risk", d: "Cholera and typhoid rise — most in dense wards with informal housing and gaps in sewerage, like M/E and L." },
];

function ElNino() {
  const city = citySeries();
  const normal = RAIN_NORMAL.slice(5, 9).reduce((a, b) => a + b, 0);
  const annual = YEARS.map((y) => {
    const jjas = city.filter((c) => c.year === y && c.month >= 5 && c.month <= 8);
    return { year: String(y), rain: Math.round(jjas.reduce((s, c) => s + c.rainfallMm, 0)), oni: Math.round((jjas.reduce((s, c) => s + c.oni, 0) / jjas.length) * 10) / 10, oct: city.find((c) => c.year === y && c.month === 9)?.lakeStoragePct ?? null };
  });

  return (
    <Page>
      <PageHeader eyebrow="Learn · climate" title="El Niño and Mumbai" description="A warm patch of the Pacific Ocean, 15,000 km away, can decide whether Mumbai's taps run through the summer — and how many people fall sick from unsafe water." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel eyebrow="Video" title="El Niño, explained" bodyClassName="p-0">
          <VideoEmbed src="https://www.youtube.com/embed/57S0Rw9L_hw" title="El Niño explained" />
        </Panel>
        <Panel eyebrow="In one minute" title="What is El Niño?">
          <p className="text-sm leading-relaxed">El Niño is the warm phase of the El Niño–Southern Oscillation (ENSO), a natural cycle that swings every 2–7 years. Scientists track it with the <strong>Oceanic Niño Index</strong>: the three-month average sea-surface temperature anomaly in the Niño 3.4 region.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><strong>ONI ≥ +0.5</strong> · El Niño (≥ +1.5 is strong)</li>
            <li><strong>−0.5 to +0.5</strong> · Neutral</li>
            <li><strong>ONI ≤ −0.5</strong> · La Niña, often a wetter monsoon</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Not every El Niño causes a drought, and the Indian Ocean Dipole can offset it — which is why NEXUS treats ONI as one driver among ten, not a verdict.</p>
        </Panel>
      </div>
      <Panel className="mt-5" eyebrow="The chain" title="From Pacific warming to ward taps">
        <ol className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CHAIN.map((c, i) => (
            <li key={c.t} className="relative rounded-md border border-border p-3">
              <span className="tabular grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <div className="mt-2 font-medium">{c.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.d}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel className="mt-5" eyebrow="Mumbai data" title="Monsoon rainfall vs ONI, 2015–2026">
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={annual}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis yAxisId="l" {...axisProps} width={48} />
              <YAxis yAxisId="r" orientation="right" {...axisProps} width={36} domain={[-2, 3]} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="l" y={normal} stroke="var(--muted-foreground)" strokeDasharray="4 3" label={{ value: "Normal", fontSize: 10, fill: "var(--muted-foreground)", position: "insideTopLeft" }} />
              <Bar yAxisId="l" dataKey="rain" name="Jun–Sep rainfall (mm)" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
              <Line yAxisId="r" dataKey="oni" name="Mean Jun–Sep ONI" stroke="var(--chart-4)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">El Niño years ({annual.filter((a) => a.oni >= 0.5).map((a) => a.year).join(", ")}) sit below the normal line. Lake storage at the end of October {LATEST.year}: {annual[annual.length - 1].oct}%.</p>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Questions" title="Common questions">
          <Accordion type="single" collapsible>
            {[
              ["Does El Niño always mean drought in Mumbai?", "No. It raises the odds of a weak monsoon, but local factors — the Indian Ocean Dipole, Arabian Sea warmth, a few extreme rain days — can change the outcome."],
              ["Why does less water mean more disease?", "Mumbai's pipes are pressurised only a few hours a day. Longer gaps let contaminated groundwater and sewage enter leaky joints, and households store water for longer."],
              ["Which wards are most exposed?", "Wards with dense informal housing and lower sewer coverage — M/E (Govandi, Mankhurd), L (Kurla), G/N (Dharavi) and parts of S and N."],
              ["What can be done ahead of time?", "Plan tanker contracts and chlorination, stock ORS, and run storage-hygiene campaigns before the dry months, not after cases rise."],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={q}><AccordionTrigger className="text-left text-sm">{q}</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </Panel>
        <Panel eyebrow="Try it" title="Explore an El Niño scenario">
          <p className="text-sm text-muted-foreground">Apply a strong El Niño, a 40% weaker monsoon and deeper water cuts, then see which wards cross into High and Critical risk.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/simulator">Open the simulator <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link to="/climate">See the ONI record</Link></Button>
          </div>
        </Panel>
      </div>
      <SimNote className="mt-6">ONI values are approximated from NOAA CPC (2025–26 simulated). Rainfall and lake storage are simulated to follow Mumbai's seasonal pattern.</SimNote>
    </Page>
  );
}
