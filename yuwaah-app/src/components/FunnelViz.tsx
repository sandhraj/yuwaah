interface FunnelVizStage {
  key: string;
  label: string;
  value: number | null;
  convActual?: number | null;
  convPlanned?: number | null;
  dropCount?: number | null;
  nudge?: boolean;
  maybe?: boolean;
  variance?: number | null;
}

interface FunnelVizProps {
  stages: FunnelVizStage[];
  mode: 'planning' | 'actuals';
}

const MIN_WIDTH_PCT = 12;

function barColors(
  mode: 'planning' | 'actuals',
  isFirst: boolean,
  convActual: number | null | undefined,
  convPlanned: number | null | undefined,
) {
  if (isFirst) return { bg: '#F3F3F1', border: '#C8C8C5', text: '#1A1A18' };
  if (mode === 'planning') return { bg: '#FDF0E9', border: '#E8601C', text: '#8B3610' };
  if (convActual == null) return { bg: '#F7F7F6', border: '#E4E4E2', text: '#6B6B68' };
  if (convPlanned == null) return { bg: '#F7F7F6', border: '#E4E4E2', text: '#6B6B68' };
  if (convActual >= convPlanned) return { bg: '#EBF8F4', border: '#1D9E75', text: '#0F6B4F' };
  if (convActual >= convPlanned * 0.8) return { bg: '#FFFBF0', border: '#F5B942', text: '#855B00' };
  return { bg: '#FCEBEB', border: '#E05252', text: '#8B2424' };
}

function toWidthPct(val: number | null, maxVal: number): number {
  if (val == null || maxVal === 0) return MIN_WIDTH_PCT;
  // sqrt scale keeps small end-of-funnel values visible while showing the drop
  const scaled = Math.sqrt(val / maxVal) * 100;
  return Math.max(scaled, MIN_WIDTH_PCT);
}

function convPillClass(actual: number, planned: number): string {
  if (actual >= planned) return 'pill-good';
  if (actual >= planned * 0.8) return 'pill-warn';
  return 'pill-bad';
}

export function FunnelViz({ stages, mode }: FunnelVizProps) {
  const maxVal = stages[0]?.value ?? 0;

  if (maxVal === 0) {
    return (
      <div className="text-center text-text-3 py-10 text-xs">
        No data to display
      </div>
    );
  }

  return (
    <div className="funnel-viz">
      {stages.map((s, i) => {
        const w = toWidthPct(s.value, maxVal);
        const isFirst = i === 0;
        const colors = barColors(mode, isFirst, s.convActual, s.convPlanned);
        const pctOfPool =
          maxVal > 0 && s.value != null
            ? Math.round((s.value / maxVal) * 100)
            : null;

        const hasActualConv = s.convActual != null;
        const hasPlannedConv = s.convPlanned != null;
        const convCC =
          hasActualConv && hasPlannedConv
            ? convPillClass(s.convActual!, s.convPlanned!)
            : 'pill-na';

        return (
          <div key={s.key}>
            {/* Connector between stages */}
            {!isFirst && (
              <div className="flex flex-col items-center" style={{ margin: '3px 0' }}>
                <div className="funnel-viz-connector-line" />
                <div className="flex items-center gap-1 py-0.5 flex-wrap justify-center">
                  {mode === 'actuals' && hasActualConv ? (
                    <span
                      className={`pill ${convCC}`}
                      style={{ fontSize: 9, padding: '1px 6px' }}
                    >
                      ↓ {s.convActual}% actual
                    </span>
                  ) : hasPlannedConv ? (
                    <span
                      className="pill pill-na"
                      style={{ fontSize: 9, padding: '1px 6px' }}
                    >
                      ↓ {s.convPlanned}% plan
                    </span>
                  ) : null}
                  {mode === 'actuals' && s.variance != null && (
                    <span
                      className={`pill ${
                        s.variance >= 0
                          ? 'pill-pos'
                          : s.variance >= -10
                          ? 'pill-zero'
                          : 'pill-neg'
                      }`}
                      style={{ fontSize: 8, padding: '1px 5px' }}
                    >
                      {s.variance >= 0 ? '+' : ''}
                      {s.variance}pp
                    </span>
                  )}
                  {s.dropCount != null && (
                    <span className="funnel-viz-drop">
                      −{s.dropCount.toLocaleString()} dropped
                    </span>
                  )}
                </div>
                <div className="funnel-viz-connector-line" />
              </div>
            )}

            {/* Bar */}
            <div className="flex justify-center">
              <div
                className={`funnel-viz-bar${s.nudge ? ' fvb-nudge' : s.maybe ? ' fvb-maybe' : ''}`}
                style={{
                  width: `${w}%`,
                  background: s.nudge
                    ? '#FFFBF0'
                    : s.maybe
                    ? '#F0E6FF'
                    : colors.bg,
                  borderColor: s.nudge
                    ? '#F5B942'
                    : s.maybe
                    ? '#C4A8E8'
                    : colors.border,
                }}
              >
                <div>
                  <div
                    className="funnel-viz-label"
                    style={{
                      color: s.nudge
                        ? '#855B00'
                        : s.maybe
                        ? '#6B3FA0'
                        : colors.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {s.nudge && (
                      <span className="badge badge-nudge" style={{ fontSize: 7 }}>
                        Nudgebay
                      </span>
                    )}
                    {s.maybe && (
                      <span className="badge badge-maybe" style={{ fontSize: 7 }}>
                        Maybe
                      </span>
                    )}
                  </div>
                </div>
                <div className="funnel-viz-count-block">
                  <div className="funnel-viz-count">
                    {s.value != null ? s.value.toLocaleString() : '—'}
                  </div>
                  {pctOfPool != null && !isFirst && (
                    <div className="funnel-viz-pct">{pctOfPool}% of pool</div>
                  )}
                  {isFirst && (
                    <div className="funnel-viz-pct">lead pool</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
