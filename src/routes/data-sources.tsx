import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, Segmented, SimNote, Stat } from "@/components/nexus/ui";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/data-sources")({
  head: () => pageHead("Data source registry", "Metadata on the MCGM, IMD, CPCB, NOAA and Census sources behind NEXUS: variables, update frequency and availability."),
  component: Sources,
});

type Status = "Integrated" | "Simulated stand-in" | "Planned";
interface Source { provider: string; dataset: string; variables: string; frequency: string; latency: string; format: string; coverage: string; status: Status; url: string; notes: string }

const SOURCES: Source[] = [
  { provider: "MCGM / Datameet", dataset: "BMC ward boundaries", variables: "24 administrative ward polygons", frequency: "Static", latency: "—", format: "GeoJSON", coverage: "Greater Mumbai", status: "Integrated", url: "https://github.com/datameet/Municipal_Spatial_Data", notes: "Simplified for the web; used by every map." },
  { provider: "Census of India", dataset: "Ward population & area (2011)", variables: "Population, area", frequency: "Decennial", latency: "Years", format: "PDF/CSV", coverage: "24 wards", status: "Integrated", url: "https://censusindia.gov.in", notes: "Approximate ward figures; 2021 census pending." },
  { provider: "NOAA CPC", dataset: "Oceanic Niño Index (ONI)", variables: "3-month SST anomaly, Niño 3.4", frequency: "Monthly", latency: "~5 days", format: "TXT", coverage: "Global index", status: "Simulated stand-in", url: "https://origin.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php", notes: "Values approximated; 2025–26 simulated." },
  { provider: "IMD", dataset: "Santacruz & Colaba observatories", variables: "Daily rainfall, Tmax, Tmin", frequency: "Daily", latency: "1 day", format: "CSV / API (request)", coverage: "2 stations + AWS network", status: "Simulated stand-in", url: "https://mausam.imd.gov.in", notes: "Ward rainfall would interpolate MCGM's automatic weather stations." },
  { provider: "MCGM Disaster Mgmt", dataset: "Automatic weather stations", variables: "15-min rainfall at ~60 sites", frequency: "15 minutes", latency: "Near real time", format: "Dashboard", coverage: "All wards", status: "Planned", url: "https://dm.mcgm.gov.in", notes: "Best source for ward-level rainfall." },
  { provider: "MCGM Hydraulic Engineer", dataset: "Lake levels (7 lakes)", variables: "Useful content (ML), % storage", frequency: "Daily (monsoon)", latency: "1 day", format: "Bulletin", coverage: "Citywide supply", status: "Simulated stand-in", url: "https://portal.mcgm.gov.in", notes: "Drives water-cut decisions." },
  { provider: "MCGM Public Health Lab", dataset: "Drinking water sample results", variables: "Unfit %, residual chlorine, coliforms", frequency: "Weekly", latency: "1–2 weeks", format: "Reports", coverage: "Ward sampling points", status: "Simulated stand-in", url: "https://portal.mcgm.gov.in", notes: "Contamination layer in the model." },
  { provider: "CPCB / MPCB", dataset: "Water quality monitoring (NWMP)", variables: "pH, BOD, DO, faecal coliform", frequency: "Monthly", latency: "Months", format: "CSV / portal", coverage: "Rivers, creeks, lakes", status: "Planned", url: "https://cpcb.nic.in/water-quality-data/", notes: "Context for raw-water quality." },
  { provider: "MCGM Epidemiology Cell", dataset: "Monsoon disease reports", variables: "Cholera, typhoid, gastro, hepatitis cases by ward", frequency: "Weekly (monsoon)", latency: "1 week", format: "Press notes / PDF", coverage: "24 wards", status: "Simulated stand-in", url: "https://portal.mcgm.gov.in", notes: "Training labels for the models." },
  { provider: "IDSP (MoHFW)", dataset: "Integrated Disease Surveillance", variables: "S/P/L syndromic & lab-confirmed cases", frequency: "Weekly", latency: "1–2 weeks", format: "IHIP portal", coverage: "District", status: "Planned", url: "https://idsp.mohfw.gov.in", notes: "Outbreak confirmations." },
];

function Sources() {
  const [status, setStatus] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");
  const rows = SOURCES.filter((s) => (status === "all" || s.status === status) && (!q || JSON.stringify(s).toLowerCase().includes(q.toLowerCase())));
  const count = (st: Status) => SOURCES.filter((s) => s.status === st).length;

  return (
    <Page>
      <PageHeader eyebrow="Data · provenance" title="Data source registry" description="Where each signal would come from, how often it updates, and whether NEXUS uses it today. Anything not marked Integrated is a simulated stand-in or planned feed." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Registered sources" value={SOURCES.length} />
        <Stat label="Integrated" value={count("Integrated")} sub="Real data in use" />
        <Stat label="Simulated stand-ins" value={count("Simulated stand-in")} sub="Demo data in their place" tone="warn" />
        <Stat label="Planned" value={count("Planned")} />
      </div>
      <Panel className="mt-5" title="Sources" bodyClassName="p-0"
        actions={<div className="flex flex-wrap gap-2"><Segmented value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, { value: "Integrated", label: "Integrated" }, { value: "Simulated stand-in", label: "Simulated" }, { value: "Planned", label: "Planned" }]} /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-40 text-xs" aria-label="Search sources" /></div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">{["Provider · dataset", "Variables", "Update", "Latency", "Format", "Coverage", "Status"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.dataset} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3"><div className="eyebrow text-[0.6rem] text-primary">{s.provider}</div><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">{s.dataset}<ExternalLink className="h-3 w-3" /></a><div className="mt-0.5 text-xs text-muted-foreground">{s.notes}</div></td>
                  <td className="px-4 py-3 text-xs">{s.variables}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{s.frequency}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{s.latency}</td>
                  <td className="px-4 py-3 text-xs">{s.format}</td>
                  <td className="px-4 py-3 text-xs">{s.coverage}</td>
                  <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${s.status === "Integrated" ? "bg-primary text-primary-foreground" : s.status === "Simulated stand-in" ? "bg-signal text-signal-foreground" : "border border-dashed border-border text-muted-foreground"}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <SimNote className="mt-6">Links point to each organisation's public portal. Access terms, formats and latency are typical values and should be confirmed with the provider before integration.</SimNote>
    </Page>
  );
}
