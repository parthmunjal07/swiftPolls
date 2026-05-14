import type { TooltipContentProps } from "recharts";

/** Bar fills derived from the app primary green — readable on light and dark card backgrounds */
export const CHART_BAR_COLORS = ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e"];

export const chartAxisTick = {
  fontSize: 12,
  fill: "var(--muted-foreground)",
} as const;

type BarTooltipPayload = {
  name?: string;
  votes?: number;
  pct?: number;
};

export function VotesBarTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const data = row.payload as BarTooltipPayload;
  const votes = typeof row.value === "number" ? row.value : data.votes ?? 0;
  const pct = data.pct;
  const title = (typeof label === "string" ? label : data.name) ?? "";

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-left shadow-md">
      <p className="text-xs font-semibold text-foreground leading-snug max-w-[220px]">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{votes}</span>
        {votes === 1 ? " vote" : " votes"}
        {pct != null && <span className="text-muted-foreground"> ({pct}%)</span>}
      </p>
    </div>
  );
}
