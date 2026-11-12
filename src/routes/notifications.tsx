import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { BellRing, Check, Mail, MessageSquare, MonitorSmartphone } from "lucide-react";
import { Page } from "@/components/nexus/Page";
import { PageHeader, Panel, RiskBadge, SimNote, Stat } from "@/components/nexus/ui";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { setNexus, useNexus } from "@/lib/nexus/store";
import { forecastRisk, THRESHOLDS } from "@/lib/nexus/risk";
import { wardByCode } from "@/lib/nexus/wards";
import { fmtPct } from "@/lib/nexus/format";
import { pageHead } from "@/lib/nexus/seo";

export const Route = createFileRoute("/notifications")({
  head: () => pageHead("Early warning notifications", "Automatic ward alerts when predicted cholera or typhoid risk crosses your thresholds."),
  component: Notifications,
});

function Notifications() {
  const s = useNexus();
  const alerts = useMemo(() => forecastAlerts(s.thresholds), [s.thresholds]);
  const unread = alerts.filter((a) => !s.readIds.includes(a.id));
  const month = forecastRisk(1)[0].month.label;

  const runCheck = () => {
    setNexus((st) => ({ ...st, lastCheckAt: new Date().toISOString() }));
    const crit = alerts.filter((a) => a.level === "Critical").length;
    if (alerts.length) toast.warning(`${alerts.length} ward alerts above your thresholds`, { description: `${crit} critical for ${month}. ${s.channels.sms || s.channels.email ? "SMS/email delivery needs a messaging backend — shown in-app only." : ""}` });
    else toast.success("All wards below your thresholds");
  };
  const setThreshold = (d: "cholera" | "typhoid", v: number) => setNexus((st) => ({ ...st, thresholds: { ...st.thresholds, [d]: v } }));
  const markRead = (id: string) => setNexus((st) => ({ ...st, readIds: Array.from(new Set([...st.readIds, id])) }));

  return (
    <Page>
      <PageHeader
        eyebrow="Early warning · rules"
        title="Early warning notifications"
        description={`Alerts fire automatically when a ward's predicted risk for ${month} meets your threshold. NEXUS runs the check each time you open the app; you can also run it on demand.`}
        actions={<Button onClick={runCheck} className="gap-2"><BellRing className="h-4 w-4" /> Run check now</Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Alerts at current thresholds" value={alerts.length} sub={month} />
        <Stat label="Unread" value={unread.length} tone={unread.length ? "warn" : "default"} />
        <Stat label="Critical" value={alerts.filter((a) => a.level === "Critical").length} tone="danger" />
        <Stat label="Last check" value={s.lastCheckAt ? new Date(s.lastCheckAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"} sub={s.lastCheckAt ? new Date(s.lastCheckAt).toLocaleDateString("en-IN") : "Not run yet"} />
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Panel eyebrow="Thresholds" title="Trigger an alert at">
            {(["cholera", "typhoid"] as const).map((d) => (
              <div key={d} className="mb-5 last:mb-0">
                <div className="mb-2 flex items-center justify-between text-sm"><span className="capitalize">{d}</span><span className="tabular font-medium">{fmtPct(s.thresholds[d])}</span></div>
                <Slider value={[s.thresholds[d]]} min={0.2} max={0.9} step={0.05} onValueChange={([v]) => setThreshold(d, v)} aria-label={`${d} threshold`} />
                <div className="mt-2 flex gap-1.5">
                  {[["Moderate", THRESHOLDS.moderate], ["High", THRESHOLDS.high], ["Critical", THRESHOLDS.critical]].map(([l, v]) => (
                    <button key={l as string} onClick={() => setThreshold(d, v as number)} className="rounded border border-border px-2 py-0.5 text-[0.7rem] text-muted-foreground hover:border-primary hover:text-primary">{l as string} {fmtPct(v as number)}</button>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
          <Panel eyebrow="Delivery" title="Channels">
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><MonitorSmartphone className="h-4 w-4 text-primary" /> In-app & toast</span><Switch checked={s.channels.inApp} onCheckedChange={(v) => setNexus((st) => ({ ...st, channels: { ...st.channels, inApp: v } }))} /></label>
              <label className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> SMS to ward health officers</span><Switch checked={s.channels.sms} onCheckedChange={(v) => setNexus((st) => ({ ...st, channels: { ...st.channels, sms: v } }))} /></label>
              <label className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email digest</span><Switch checked={s.channels.email} onCheckedChange={(v) => setNexus((st) => ({ ...st, channels: { ...st.channels, email: v } }))} /></label>
              <label className="flex items-center justify-between gap-3 border-t border-border pt-3"><span>Check automatically on open</span><Switch checked={s.autoCheck} onCheckedChange={(v) => setNexus((st) => ({ ...st, autoCheck: v }))} /></label>
            </div>
            {(s.channels.sms || s.channels.email) && <p className="mt-3 text-xs text-muted-foreground">SMS and email need a messaging service connected; until then those alerts appear in-app only.</p>}
          </Panel>
        </div>
        <Panel eyebrow="Feed" title={`Notifications · ${month} forecast`} actions={<Button variant="ghost" size="sm" onClick={() => setNexus((st) => ({ ...st, readIds: Array.from(new Set([...st.readIds, ...alerts.map((a) => a.id)])) }))}>Mark all read</Button>} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {alerts.map((a) => {
              const read = s.readIds.includes(a.id);
              return (
                <li key={a.id} className={`flex flex-wrap items-start gap-3 px-4 py-3 ${read ? "opacity-70" : ""}`}>
                  <RiskBadge level={a.level} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Ward {a.ward} ({wardByCode(a.ward).areas.split(",")[0]}): <span className="capitalize">{a.disease}</span> risk {fmtPct(a.prob)}</div>
                    <div className="text-xs text-muted-foreground">Drivers: {a.drivers.map((d) => d.label.toLowerCase()).join(", ")}</div>
                    <div className="mt-1 text-xs">Recommended: {a.actions[0]}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!read && <Button size="sm" variant="ghost" onClick={() => markRead(a.id)} className="gap-1"><Check className="h-3.5 w-3.5" /> Read</Button>}
                    <Button asChild size="sm" variant="outline"><Link to="/alerts">Manage</Link></Button>
                  </div>
                </li>
              );
            })}
            {alerts.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">No ward meets these thresholds. Lower a threshold to see more alerts.</li>}
          </ul>
        </Panel>
      </div>
      <SimNote className="mt-6">Alerts are generated from simulated forecasts. Threshold and channel settings are saved in this browser only.</SimNote>
    </Page>
  );
}
