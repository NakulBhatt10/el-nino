import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_LEVELS, type RiskLevel } from "@/lib/nexus/risk";
import { RISK_CLASS } from "@/lib/nexus/palette";
import { WARDS } from "@/lib/nexus/wards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <div className="eyebrow mb-2 flex items-center gap-2 text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          {eyebrow}
        </div>
        <h1 className="text-3xl leading-tight text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2" data-print-hide>{actions}</div>}
    </div>
  );
}

export function Panel({ title, eyebrow, actions, children, className, bodyClassName }: { title?: ReactNode; eyebrow?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      {(title || eyebrow || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-0.5 text-[0.6rem] text-muted-foreground">{eyebrow}</div>}
            {title && <h2 className="text-lg leading-snug">{title}</h2>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "default" | "warn" | "danger" }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-card p-4">
      {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("tabular mt-0.5 font-serif text-2xl leading-tight", tone === "danger" && "text-destructive", tone === "warn" && "text-signal-foreground")}>{value}</div>
        {sub && <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export function RiskDot({ level, className }: { level: RiskLevel; className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", RISK_CLASS[level], className)} />;
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium", className)}>
      <RiskDot level={level} className="h-2 w-2" />
      {level}
    </span>
  );
}

export function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs text-muted-foreground", className)}>
      {RISK_LEVELS.map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <RiskDot level={l} /> {l}
        </span>
      ))}
    </div>
  );
}

export function SimNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div>{children}</div>
    </div>
  );
}

export function WardSelect({ value, onChange, includeCity, className }: { value: string; onChange: (v: string) => void; includeCity?: boolean; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-[220px] bg-card", className)} aria-label="Ward">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeCity && <SelectItem value="city">All Mumbai (24 wards)</SelectItem>}
        {WARDS.map((w) => (
          <SelectItem key={w.code} value={w.code}>
            {w.code} · {w.areas.split(",")[0]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-md border border-border bg-card p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[4px] px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
} as const;

export const axisProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  stroke: "var(--border)",
  tickLine: false,
} as const;

export function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-hero">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
