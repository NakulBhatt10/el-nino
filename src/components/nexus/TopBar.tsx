import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useMemo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { setNexus, useNexus } from "@/lib/nexus/store";
import { LATEST } from "@/lib/nexus/series";
import { RiskDot } from "./ui";
import { fmtPct } from "@/lib/nexus/format";

export function TopBar() {
  const s = useNexus();
  const alerts = useMemo(() => forecastAlerts(s.thresholds), [s.thresholds]);
  const unread = alerts.filter((a) => !s.readIds.includes(a.id));

  return (
    <header data-print-hide className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-5">
      <SidebarTrigger />
      <div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
        <span className="truncate">Simulated data through {LATEST.label} · predictions are illustrative</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-2" aria-label="Early-warning notifications">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {unread.length > 0 && (
                <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-destructive-foreground">
                  {unread.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="eyebrow text-primary">Early warning</div>
                <div className="text-sm font-medium">{unread.length} unread forecast alerts</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNexus((st) => ({ ...st, readIds: Array.from(new Set([...st.readIds, ...alerts.map((a) => a.id)])) }))}>
                Mark all read
              </Button>
            </div>
            <ul className="max-h-80 overflow-auto">
              {alerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start gap-3 border-b px-4 py-2.5 last:border-0">
                  <RiskDot level={a.level} className="mt-1.5" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-medium">
                      Ward {a.ward} · <span className="capitalize">{a.disease}</span> {fmtPct(a.prob)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.monthLabel} forecast · {a.drivers[0]?.label}</div>
                  </div>
                  {!s.readIds.includes(a.id) && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                </li>
              ))}
              {alerts.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No wards above your thresholds.</li>}
            </ul>
            <div className="border-t p-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/notifications">Open notification centre</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
