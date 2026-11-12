import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, SimNote, Stat } from "@/components/nexus/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { forecastAlerts, historicalAlerts, type Alert, type AlertStatus } from "@/lib/nexus/alerts";
import { setNexus, useNexus } from "@/lib/nexus/store";
import { WARDS, wardByCode } from "@/lib/nexus/wards";
import { fmtPct, toCSV, downloadFile } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/alerts")({
  head: () => pageHead("Alert management", "Alert history, severity levels, status tracking and recommended actions for Mumbai wards."),
  component: Alerts,
});

const STATUSES: AlertStatus[] = ["Active", "Acknowledged", "Escalated", "Resolved"];
const PAGE = 20;

function Alerts() {
  const s = useNexus();
  const all = useMemo(() => [...forecastAlerts(s.thresholds), ...historicalAlerts()], [s.thresholds]);
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("open");
  const [ward, setWard] = useState("all");
  const [disease, setDisease] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Alert | null>(null);
  const [note, setNote] = useState("");

  const statusOf = (a: Alert) => s.alertOverrides[a.id]?.status ?? a.defaultStatus;
  const filtered = all.filter((a) =>
    (severity === "all" || a.level === severity) &&
    (status === "all" || (status === "open" ? statusOf(a) !== "Resolved" : statusOf(a) === status)) &&
    (ward === "all" || a.ward === ward) && (disease === "all" || a.disease === disease));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const update = (a: Alert, st: AlertStatus) => {
    setNexus((x) => ({ ...x, alertOverrides: { ...x.alertOverrides, [a.id]: { status: st, note: note || x.alertOverrides[a.id]?.note, updatedAt: new Date().toISOString() } } }));
    toast.success(`Ward ${a.ward} ${a.disease} alert marked ${st.toLowerCase()}`);
    setOpen(null);
  };
  const exportCsv = () => downloadFile("nexus-alerts.csv", toCSV(filtered.map((a) => ({ id: a.id, ward: a.ward, disease: a.disease, severity: a.level, probability: a.prob.toFixed(3), month: a.monthLabel, kind: a.kind, issued: a.issuedOn, status: statusOf(a), drivers: a.drivers.map((d) => d.label).join("; "), actions: a.actions.join("; ") }))));
  const counts = STATUSES.map((st) => ({ st, n: all.filter((a) => statusOf(a) === st).length }));

  return (
    <Page>
      <PageHeader
        eyebrow="Early warning · operations"
        title="Alert management"
        description="Every alert NEXUS has raised: forecast alerts for next month plus observed onsets since 2015. Acknowledge, escalate or resolve them and keep notes for the ward health office."
        actions={<Button variant="outline" onClick={exportCsv}>Export CSV</Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map((c) => <Stat key={c.st} label={c.st} value={c.n} tone={c.st === "Active" && c.n ? "danger" : c.st === "Escalated" && c.n ? "warn" : "default"} />)}
      </div>
      <Panel className="mt-5" title={`${filtered.length} alerts`} bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              { v: severity, set: setSeverity, label: "Severity", opts: [["all", "All severities"], ["Critical", "Critical"], ["High", "High"]] },
              { v: status, set: setStatus, label: "Status", opts: [["open", "Open (not resolved)"], ["all", "All statuses"], ...STATUSES.map((x) => [x, x])] },
              { v: disease, set: setDisease, label: "Disease", opts: [["all", "Both diseases"], ["cholera", "Cholera"], ["typhoid", "Typhoid"]] },
              { v: ward, set: setWard, label: "Ward", opts: [["all", "All wards"], ...WARDS.map((w) => [w.code, `Ward ${w.code}`])] },
            ].map((f) => (
              <Select key={f.label} value={f.v} onValueChange={(v) => { f.set(v); setPage(0); }}>
                <SelectTrigger className="h-8 w-[150px] bg-card text-xs" aria-label={f.label}><SelectValue /></SelectTrigger>
                <SelectContent>{f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            ))}
          </div>
        }>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Issued</TableHead><TableHead>Ward</TableHead><TableHead>Disease</TableHead><TableHead>Severity</TableHead><TableHead className="text-right">Risk</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {shown.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="tabular text-xs">{a.issuedOn}<div className="text-muted-foreground">{a.monthLabel}</div></TableCell>
                  <TableCell>{a.ward} <span className="text-xs text-muted-foreground">· {wardByCode(a.ward).areas.split(",")[0]}</span></TableCell>
                  <TableCell className="capitalize">{a.disease}</TableCell>
                  <TableCell><RiskBadge level={a.level} /></TableCell>
                  <TableCell className="tabular text-right">{fmtPct(a.prob)}</TableCell>
                  <TableCell className="text-xs">{a.kind}</TableCell>
                  <TableCell className="text-xs"><span className={statusOf(a) === "Active" ? "font-semibold text-destructive" : statusOf(a) === "Escalated" ? "font-semibold" : "text-muted-foreground"}>{statusOf(a)}</span></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => { setOpen(a); setNote(s.alertOverrides[a.id]?.note ?? ""); }}>Open</Button></TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No alerts match these filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl font-normal">Ward {open.ward} · <span className="capitalize">{open.disease}</span></SheetTitle>
                <SheetDescription>{wardByCode(open.ward).areas} · {open.kind} alert for {open.monthLabel}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-5 px-4 pb-6 text-sm">
                <div className="flex items-center gap-3"><RiskBadge level={open.level} /><span className="tabular">{fmtPct(open.prob)} outbreak probability</span><span className="ml-auto text-xs text-muted-foreground">{statusOf(open)}</span></div>
                <div>
                  <div className="eyebrow text-[0.6rem] text-muted-foreground">Main drivers</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">{open.drivers.map((d) => <li key={d.key}>{d.label} (+{d.value.toFixed(2)})</li>)}</ul>
                </div>
                <div>
                  <div className="eyebrow text-[0.6rem] text-muted-foreground">Recommended actions</div>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5">{open.actions.map((x) => <li key={x}>{x}</li>)}</ol>
                </div>
                <div>
                  <div className="eyebrow mb-1 text-[0.6rem] text-muted-foreground">Note</div>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tanker deployed to Shivaji Nagar, samples sent to lab" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => update(open, "Acknowledged")}>Acknowledge</Button>
                  <Button variant="outline" onClick={() => update(open, "Escalated")}>Escalate</Button>
                  <Button onClick={() => update(open, "Resolved")}>Resolve</Button>
                </div>
                {statusOf(open) !== open.defaultStatus && <Button variant="ghost" size="sm" onClick={() => { setNexus((x) => { const o = { ...x.alertOverrides }; delete o[open.id]; return { ...x, alertOverrides: o }; }); setOpen(null); }}>Reset status</Button>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <SimNote className="mt-6">Alert history is derived from simulated data. Status changes and notes are saved in this browser only.</SimNote>
    </Page>
  );
}
