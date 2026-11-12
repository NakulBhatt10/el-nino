import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, VideoEmbed } from "@/components/nexus/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/disease-education")({
  head: () => pageHead("Water-borne disease education", "Cholera and typhoid explained for Mumbai: symptoms, how they spread, prevention and when to seek care."),
  component: Education,
});

const DISEASES = {
  cholera: {
    name: "Cholera",
    agent: "Vibrio cholerae bacteria",
    incubation: "A few hours to 5 days",
    symptoms: ["Sudden, profuse watery diarrhoea ('rice-water' stools)", "Vomiting and leg cramps", "Rapid dehydration: sunken eyes, dry mouth, little or no urine", "Most infections are mild, but severe cases can be fatal within hours without fluids"],
    spread: ["Drinking water contaminated with faeces", "Food washed or prepared with unsafe water", "Ice, juices and street food from unsafe sources", "Flooded drains overflowing into water lines"],
    prevent: ["Drink boiled, chlorinated or sealed water", "Wash hands with soap after the toilet and before food", "Eat food that is hot and freshly cooked", "Oral cholera vaccine in outbreak settings"],
    care: "Start ORS immediately and go to the nearest health post or hospital if diarrhoea is heavy, there is vomiting, or a child or older person seems drowsy.",
  },
  typhoid: {
    name: "Typhoid",
    agent: "Salmonella Typhi bacteria",
    incubation: "6 to 30 days",
    symptoms: ["Fever that climbs over several days, often above 39 °C", "Headache, weakness and loss of appetite", "Stomach pain, constipation or diarrhoea", "Sometimes a rash of rose-coloured spots"],
    spread: ["Water or food contaminated by a carrier's faeces", "Leaky pipes near sewers during intermittent supply", "Raw salads and cut fruit washed in unsafe water", "Untreated carriers handling food"],
    prevent: ["Safe drinking water and covered storage", "Handwashing, especially for food handlers", "Typhoid conjugate vaccine (TCV) from 6 months of age", "Avoid raw food from unhygienic stalls during the monsoon"],
    care: "See a doctor for any fever lasting more than 3 days. Typhoid needs a blood test and a full course of the prescribed antibiotics — rising drug resistance makes self-medication risky.",
  },
};

const CHECKLIST = ["Water is boiled for 1 minute or chlorinated", "Storage containers are covered and narrow-necked", "A ladle is used instead of dipping hands", "Tanks are cleaned at least monthly", "Soap is kept beside the toilet and kitchen", "ORS packets are at home", "Children have had typhoid vaccine"];

function Education() {
  const [d, setD] = useState<keyof typeof DISEASES>("cholera");
  const [checked, setChecked] = useState<string[]>([]);
  const info = DISEASES[d];
  return (
    <Page>
      <PageHeader eyebrow="Learn · health" title="Water-borne diseases" description="Cholera and typhoid are both spread by water or food contaminated with human faeces — and both are preventable. Here is what to watch for and what to do." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel eyebrow="Video" title="How water-borne diseases spread" bodyClassName="p-0">
          <VideoEmbed src="https://www.youtube.com/embed/jG1VNSCsP5Q" title="Water-borne diseases explained" />
        </Panel>
        <Panel eyebrow="At a glance" title="Cholera vs typhoid">
          <table className="w-full text-sm">
            <tbody>
              {[["Cause", DISEASES.cholera.agent, DISEASES.typhoid.agent], ["Incubation", DISEASES.cholera.incubation, DISEASES.typhoid.incubation], ["Main sign", "Watery diarrhoea", "Prolonged fever"], ["Key danger", "Dehydration", "Complications if untreated"], ["Vaccine", "Oral cholera vaccine", "Typhoid conjugate vaccine"]].map(([k, a, b]) => (
                <tr key={k} className="border-b border-border last:border-0 align-top"><td className="py-2 pr-2 text-xs text-muted-foreground">{k}</td><td className="py-2 pr-2">{a}</td><td className="py-2">{b}</td></tr>
              ))}
            </tbody>
            <thead><tr className="text-left text-xs"><th /><th className="pb-1 font-semibold text-primary">Cholera</th><th className="pb-1 font-semibold text-primary">Typhoid</th></tr></thead>
          </table>
        </Panel>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Segmented value={d} onChange={setD} options={[{ value: "cholera", label: "Cholera" }, { value: "typhoid", label: "Typhoid" }]} />
        <span className="text-sm text-muted-foreground">Caused by {info.agent} · incubation {info.incubation}</span>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {([["Symptoms", info.symptoms], ["How it spreads", info.spread], ["Prevention", info.prevent]] as [string, string[]][]).map(([t, list]) => (
          <Panel key={t} eyebrow={info.name} title={t}>
            <ul className="space-y-2 text-sm">{list.map((x) => <li key={x} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />{x}</li>)}</ul>
          </Panel>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-destructive/40 bg-card p-4">
        <div className="eyebrow text-destructive">When to seek care</div>
        <p className="mt-1 text-sm">{info.care}</p>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Household" title={`Safe-water checklist · ${checked.length}/${CHECKLIST.length}`}>
          <ul className="space-y-2.5">
            {CHECKLIST.map((c) => (
              <li key={c}><label className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox checked={checked.includes(c)} onCheckedChange={() => setChecked((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} />{c}</label></li>
            ))}
          </ul>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(checked.length / CHECKLIST.length) * 100}%` }} /></div>
        </Panel>
        <Panel eyebrow="Myths & facts" title="Clearing up confusion">
          <Accordion type="single" collapsible>
            {[
              ["“Clear water is safe water.”", "Bacteria are invisible. Clear tap water can still carry Vibrio cholerae or S. Typhi, especially after supply interruptions."],
              ["“Filters remove everything.”", "Cloth and basic candle filters remove dirt, not all bacteria. Boil, chlorinate or use a certified purifier."],
              ["“Stop drinking when you have diarrhoea.”", "The opposite — keep drinking ORS. Dehydration, not diarrhoea itself, is what makes cholera dangerous."],
              ["“Typhoid fever goes away on its own.”", "It can last weeks and cause serious complications. It needs testing and the right antibiotics."],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={q}><AccordionTrigger className="text-left text-sm">{q}</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
          <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/recommendations">See ward action plans</Link></Button>
        </Panel>
      </div>
      <SimNote className="mt-6">General health information, not medical advice. Follow guidance from MCGM's Public Health Department and your doctor.</SimNote>
    </Page>
  );
}
