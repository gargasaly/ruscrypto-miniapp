type BadgeTone = "green" | "yellow" | "red" | "neutral";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  green:
    "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 shadow-emerald-950/20",
  yellow:
    "border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-amber-950/20",
  red:
    "border-rose-300/25 bg-rose-300/10 text-rose-100 shadow-rose-950/20",
  neutral:
    "border-white/10 bg-white/[0.06] text-zinc-300 shadow-black/10",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold leading-none shadow-sm ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
