import { useEffect } from "react";
import { toast } from "sonner";
import { forecastAlerts } from "@/lib/nexus/alerts";
import { setNexus, useNexus } from "@/lib/nexus/store";

/** Runs the threshold check once per browser session and surfaces new alerts as a toast. */
export function AutoAlertCheck() {
  const s = useNexus();
  useEffect(() => {
    if (!s.autoCheck || !s.channels.inApp) return;
    if (sessionStorage.getItem("nexus-checked")) return;
    sessionStorage.setItem("nexus-checked", "1");
    const alerts = forecastAlerts(s.thresholds);
    const unread = alerts.filter((a) => !s.readIds.includes(a.id));
    setNexus((st) => ({ ...st, lastCheckAt: new Date().toISOString() }));
    if (unread.length) {
      const crit = unread.filter((a) => a.level === "Critical").length;
      toast.warning(`${unread.length} new early-warning alerts`, {
        description: `${crit} critical · highest: Ward ${unread[0].ward} ${unread[0].disease} (simulated forecast)`,
      });
    }
  }, [s.autoCheck, s.channels.inApp, s.thresholds, s.readIds]);
  return null;
}
