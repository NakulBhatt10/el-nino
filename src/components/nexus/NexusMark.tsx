export function NexusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" className="fill-primary" />
      <path d="M8 13c2.5-2 5.5-2 8 0s5.5 2 8 0M8 17.5c2.5-2 5.5-2 8 0s5.5 2 8 0M8 22c2.5-2 5.5-2 8 0s5.5 2 8 0" className="stroke-primary-foreground" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="22.5" cy="9" r="2" className="fill-signal" />
    </svg>
  );
}
