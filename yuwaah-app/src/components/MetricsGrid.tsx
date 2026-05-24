interface Metric {
  label: string;
  value: string;
  sub: string;
  color?: string;
}

interface MetricsGridProps {
  metrics: Metric[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white border border-border rounded-lg p-4 px-[18px] shadow-card">
          <div className="text-[11px] text-text-2 mb-1.5">{m.label}</div>
          <div
            className="text-[26px] font-semibold tracking-[-0.5px] leading-none"
            style={m.color ? { color: m.color } : undefined}
          >
            {m.value}
          </div>
          <div className="text-[11px] text-text-3 mt-1.5">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}
