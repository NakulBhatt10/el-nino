// Client-side PDF reports (jsPDF loaded on demand).
import { currentRisk, forecastRisk, levelCounts, type WardRisk } from "./risk";
import { forecastAlerts, type Thresholds } from "./alerts";
import { citySeries, cityCases, LATEST } from "./series";
import { recommendationsFor } from "./recommendations";
import { wardByCode } from "./wards";
import { RISK_HEX, FOREST } from "./palette";

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pct = (p: number) => `${Math.round(p * 100)}%`;

export type ReportKind = "city" | "ward" | "alerts";

export async function generateReport(kind: ReportKind, opts: { ward?: string; horizon?: number; thresholds: Thresholds }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const rows: WardRisk[] = opts.horizon ? forecastRisk(opts.horizon) : currentRisk();
  const period = rows[0].month.label;

  doc.setFillColor(...hex(FOREST));
  doc.rect(0, 0, W, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  const title = kind === "city" ? "Mumbai risk bulletin" : kind === "ward" ? `Ward ${opts.ward} report` : "Early-warning alert summary";
  doc.text(title, 40, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`NEXUS · Mumbai AI Early Warning System · ${opts.horizon ? "Forecast" : "Observed"} ${period} · generated ${new Date().toLocaleDateString("en-IN")}`, 40, 62);
  doc.setTextColor(120, 90, 30);
  doc.setFontSize(8);
  doc.text("DEMONSTRATION: figures are simulated and scores come from an interpretable baseline model, not trained STGNN/Transformer models.", 40, 96);
  doc.setTextColor(30, 40, 35);

  let y = 120;
  if (kind === "city") {
    const c = levelCounts(rows);
    const city = citySeries()[LATEST.idx];
    const k = cityCases(LATEST.idx);
    const kpis: [string, string][] = [["Critical wards", String(c.Critical)], ["High wards", String(c.High)], ["ONI", city.oni.toFixed(1)], ["Lake storage", `${city.lakeStoragePct}%`], [`Cases ${LATEST.label}`, `${k.typhoid} T / ${k.cholera} C`]];
    kpis.forEach(([l, v], i) => {
      const x = 40 + i * 104;
      doc.setDrawColor(220, 228, 222);
      doc.rect(x, y, 96, 46);
      doc.setFontSize(7); doc.setTextColor(110, 120, 115); doc.text(l, x + 8, y + 14);
      doc.setFontSize(14); doc.setTextColor(30, 40, 35); doc.text(v, x + 8, y + 34);
    });
    y += 70;
    doc.setFontSize(11); doc.text("Composite risk by ward", 40, y); y += 10;
    const sorted = [...rows].sort((a, b) => b.composite - a.composite);
    const bw = (W - 80) / sorted.length;
    sorted.forEach((r, i) => {
      const h = r.composite * 110;
      doc.setFillColor(...hex(RISK_HEX[r.level]));
      doc.rect(40 + i * bw + 2, y + 120 - h, bw - 4, h, "F");
      doc.setFontSize(6); doc.setTextColor(80, 90, 85);
      doc.text(r.ward, 40 + i * bw + bw / 2, y + 130, { align: "center" });
    });
    y += 150;
    autoTable(doc, {
      startY: y,
      head: [["Ward", "Areas", "Cholera", "Typhoid", "Level", "Top driver"]],
      body: sorted.map((r) => [r.ward, wardByCode(r.ward).areas, pct(r.cholera.prob), pct(r.typhoid.prob), r.level, r.typhoid.contributions.find((x) => x.value > 0)?.label ?? "—"]),
      styles: { fontSize: 7.5 }, headStyles: { fillColor: hex(FOREST) }, margin: { left: 40, right: 40 },
    });
  } else if (kind === "ward" && opts.ward) {
    const r = rows.find((x) => x.ward === opts.ward)!;
    const w = wardByCode(opts.ward);
    doc.setFontSize(10);
    doc.text(`${w.areas} · ${w.zone} · population ${w.population.toLocaleString("en-IN")} (2011)`, 40, y); y += 22;
    doc.setFontSize(12);
    doc.text(`Cholera ${pct(r.cholera.prob)}   ·   Typhoid ${pct(r.typhoid.prob)}   ·   Level: ${r.level}`, 40, y); y += 20;
    autoTable(doc, {
      startY: y,
      head: [["Driver", "Normalised value", "Cholera contribution", "Typhoid contribution"]],
      body: r.cholera.contributions.map((c) => [c.label, c.feature.toFixed(2), c.value.toFixed(2), r.typhoid.contributions.find((t) => t.key === c.key)!.value.toFixed(2)]),
      styles: { fontSize: 8 }, headStyles: { fillColor: hex(FOREST) }, margin: { left: 40, right: 40 },
    });
    // @ts-expect-error lastAutoTable is added by the plugin
    y = doc.lastAutoTable.finalY + 24;
    doc.setFontSize(11); doc.text("Recommended actions", 40, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Priority", "Action", "Owner"]],
      body: recommendationsFor(r, 6).map((a) => [a.priority, `${a.title}: ${a.detail}`, a.owner]),
      styles: { fontSize: 8 }, headStyles: { fillColor: hex(FOREST) }, columnStyles: { 1: { cellWidth: 300 } }, margin: { left: 40, right: 40 },
    });
  } else {
    const alerts = forecastAlerts(opts.thresholds, opts.horizon || 1);
    doc.setFontSize(10);
    doc.text(`${alerts.length} alerts at thresholds cholera ${pct(opts.thresholds.cholera)} / typhoid ${pct(opts.thresholds.typhoid)}`, 40, y); y += 14;
    autoTable(doc, {
      startY: y,
      head: [["Ward", "Disease", "Risk", "Severity", "Drivers", "First action"]],
      body: alerts.map((a) => [a.ward, a.disease, pct(a.prob), a.level, a.drivers.map((d) => d.label).join(", "), a.actions[0]]),
      styles: { fontSize: 7.5 }, headStyles: { fillColor: hex(FOREST) }, margin: { left: 40, right: 40 },
    });
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(130, 140, 135);
    doc.text(`NEXUS Mumbai · simulated demo data · page ${i} of ${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
  }
  doc.save(`nexus-${kind}${kind === "ward" && opts.ward ? `-${opts.ward.replace("/", "")}` : ""}-${rows[0].month.key}.pdf`);
}
