import type { DataState, StateView, WeeklyTarget } from '../types';
import { STAGE_DEFS, CONV_ORDER } from '../constants';
import { computeCalendarWeeks, calcConv } from '../utils';
import { FunnelVizH } from '../components/FunnelVizH';
import type { FunnelBand, ConvRate } from '../components/FunnelVizH';

interface OverviewPageProps {
  data: DataState;
  view: StateView;
  endDate: string;
  setEndDate: (d: string) => void;
}

const STATE_COLOR: Record<string, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };
const STATE_LABEL: Record<string, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
type StateKey = 'rj' | 'od' | 'jh';
const STATES: StateKey[] = ['rj', 'od', 'jh'];

function getWeekTargets(
  week_start: string,
  weeklyTargets: WeeklyTarget[],
  evenSplit: WeeklyTarget,
): WeeklyTarget {
  return weeklyTargets.find((w) => w.week_start === week_start) ?? evenSplit;
}

export function OverviewPage({ data, view, endDate, setEndDate }: OverviewPageProps) {
  const weeks = computeCalendarWeeks(endDate);
  const totalWeeks = weeks.length || 1;

  const visibleStates: StateKey[] = view === 'all' ? STATES : [view as StateKey];

  // Even split defaults (total target / total weeks)
  const evenSplit: WeeklyTarget = {
    week_start: '',
    week_end: '',
    rj: Math.ceil(data.targets.rj / totalWeeks),
    od: Math.ceil(data.targets.od / totalWeeks),
    jh: Math.ceil(data.targets.jh / totalWeeks),
  };

  // Overall actuals
  const getActuals = (state: 'rj' | 'od' | 'jh') => data.actuals[state] || {};

  const totalTarget = visibleStates.reduce((s, st) => s + (data.targets[st] || 0), 0);
  const totalActual = visibleStates.reduce((s, st) => s + Number(getActuals(st).migrated ?? 0), 0);
  const totalPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  const remaining = totalTarget - totalActual;
  const weeksLeft = weeks.filter((w) => !w.isPast).length;

  // Actuals funnel bands
  const actualsBands: FunnelBand[] = visibleStates
    .map((st) => ({
      id: st,
      label: STATE_LABEL[st],
      color: STATE_COLOR[st],
      stages: STAGE_DEFS.map((s) => {
        const v = data.actuals[st]?.[s.key];
        return v != null ? Number(v) : null;
      }),
    }))
    .filter((b) => b.stages.some((v) => v != null && v > 0));

  const combinedActuals = (() => {
    const c: Record<string, number | null> = {};
    STAGE_DEFS.forEach((s) => { c[s.key] = null; });
    visibleStates.forEach((st) => {
      const a = data.actuals[st] || {};
      STAGE_DEFS.forEach((s) => {
        const v = a[s.key];
        if (v != null) c[s.key] = ((c[s.key] as number) || 0) + Number(v);
      });
    });
    return c;
  })();

  const funnelConvRates: ConvRate[] = CONV_ORDER.map((key, i) => ({
    actual: calcConv(combinedActuals as Record<string, number | null>, STAGE_DEFS[i].key, STAGE_DEFS[i + 1].key),
    planned: data.conv[key] ?? null,
  }));

  const pctColor = totalPct >= 90 ? '#0F6E56' : totalPct >= 70 ? '#E8601C' : '#A03030';

  return (
    <div className="space-y-4">

      {/* Project header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-6 flex-wrap">
            <div>
              <div className="text-[11px] text-text-2 mb-1">Total target</div>
              <div className="text-3xl font-semibold tracking-tight">{totalTarget.toLocaleString()}</div>
              <div className="text-[11px] text-text-3 mt-0.5">migrations</div>
            </div>
            <div>
              <div className="text-[11px] text-text-2 mb-1">Achieved so far</div>
              <div className="text-3xl font-semibold tracking-tight" style={{ color: pctColor }}>
                {totalActual.toLocaleString()}
              </div>
              <div className="text-[11px] text-text-3 mt-0.5">{totalPct}% of target</div>
            </div>
            <div>
              <div className="text-[11px] text-text-2 mb-1">Remaining</div>
              <div className="text-3xl font-semibold tracking-tight">{remaining.toLocaleString()}</div>
              <div className="text-[11px] text-text-3 mt-0.5">across {weeksLeft} week{weeksLeft !== 1 ? 's' : ''}</div>
            </div>
            {weeksLeft > 0 && (
              <div>
                <div className="text-[11px] text-text-2 mb-1">Needed per week</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {Math.ceil(remaining / weeksLeft).toLocaleString()}
                </div>
                <div className="text-[11px] text-text-3 mt-0.5">avg. to close gap</div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-text-2">Project end date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-border rounded-md px-3 py-1.5 text-xs bg-bg-2 text-text cursor-pointer"
            />
            <div className="text-[10px] text-text-3">{weeks.length} calendar weeks</div>
          </div>
        </div>

        {/* State progress bars */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {visibleStates.map((st) => {
            const act = Number(getActuals(st).migrated ?? 0);
            const tgt = data.targets[st] || 0;
            const pct = tgt > 0 ? Math.min(Math.round((act / tgt) * 100), 100) : 0;
            const col = pct >= 90 ? '#0F6E56' : pct >= 70 ? '#E8601C' : '#A03030';
            return (
              <div key={st} className="bg-bg-2 border border-border rounded-lg p-3">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-medium" style={{ color: STATE_COLOR[st] }}>
                    {STATE_LABEL[st]}
                  </span>
                  <span className="text-[11px] text-text-3">{act} / {tgt}</span>
                </div>
                <div className="h-2 bg-bg-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: col }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: col }}>{pct}%</span>
                  <span className="text-[10px] text-text-3">{tgt - act} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly targets table */}
      <div className="card">
        <div className="card-title">Weekly targets</div>
        {weeks.length === 0 ? (
          <div className="text-[12px] text-text-2 py-4 text-center">
            Set a project end date above to see the weekly breakdown.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-left p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase whitespace-nowrap">
                    Week
                  </th>
                  <th className="text-left p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase whitespace-nowrap">
                    Dates
                  </th>
                  {visibleStates.map((st) => (
                    <th key={st} className="text-right p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] border-b border-border uppercase" style={{ color: STATE_COLOR[st] }}>
                      {st.toUpperCase()}
                    </th>
                  ))}
                  <th className="text-right p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase">
                    Total
                  </th>
                  <th className="text-left p-1.5 px-3 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => {
                  const wt = getWeekTargets(week.week_start, data.weeklyTargets, evenSplit);
                  const rowTotal = visibleStates.reduce((s, st) => s + (wt[st] || 0), 0);
                  const rowCls = week.isCurrent
                    ? 'bg-[#1A2E1A]/40 font-medium'
                    : week.isPast
                    ? 'opacity-50'
                    : '';
                  return (
                    <tr key={week.week_start} className={`border-b border-border/40 ${rowCls}`}>
                      <td className="p-1.5 px-2 whitespace-nowrap text-text-2">
                        W{week.weekNum}
                        {week.isCurrent && (
                          <span className="ml-1.5 text-[9px] bg-orange/20 text-orange px-1 py-0.5 rounded">Now</span>
                        )}
                      </td>
                      <td className="p-1.5 px-2 whitespace-nowrap text-text-3 text-[11px]">{week.label}</td>
                      {visibleStates.map((st) => (
                        <td key={st} className="p-1.5 px-2 text-right">
                          {wt[st] || 0}
                          {!data.weeklyTargets.find((w) => w.week_start === week.week_start) && (
                            <span className="text-text-3 text-[9px] ml-0.5">~</span>
                          )}
                        </td>
                      ))}
                      <td className="p-1.5 px-2 text-right font-medium">{rowTotal}</td>
                      <td className="p-1.5 px-3 text-[11px] text-text-3">
                        {week.isPast ? 'Past' : week.isCurrent ? '→ In progress' : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={2} className="p-1.5 px-2 text-[11px] font-semibold text-text-2">Total target</td>
                  {visibleStates.map((st) => (
                    <td key={st} className="p-1.5 px-2 text-right font-semibold">{data.targets[st]}</td>
                  ))}
                  <td className="p-1.5 px-2 text-right font-semibold">{totalTarget}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={2} className="p-1.5 px-2 text-[11px] text-text-2">Achieved to date</td>
                  {visibleStates.map((st) => (
                    <td key={st} className="p-1.5 px-2 text-right text-[11px]" style={{ color: STATE_COLOR[st] }}>
                      {Number(getActuals(st).migrated ?? 0)}
                    </td>
                  ))}
                  <td className="p-1.5 px-2 text-right text-[11px]" style={{ color: pctColor }}>{totalActual}</td>
                  <td className="p-1.5 px-3 text-[11px]" style={{ color: pctColor }}>{totalPct}% done</td>
                </tr>
                <tr className="border-t border-border/40">
                  <td colSpan={2} className="p-1.5 px-2 text-[11px] text-text-3">Still needed</td>
                  {visibleStates.map((st) => (
                    <td key={st} className="p-1.5 px-2 text-right text-[11px] text-text-3">
                      {data.targets[st] - Number(getActuals(st).migrated ?? 0)}
                    </td>
                  ))}
                  <td className="p-1.5 px-2 text-right text-[11px] text-text-3">{remaining}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <div className="mt-2 text-[10px] text-text-3">
              ~ = even-split default · Set exact weekly targets in the <strong>Weekly_Targets</strong> tab in Google Sheets
            </div>
          </div>
        )}
      </div>

      {/* Overall pipeline funnel — actuals */}
      {actualsBands.length > 0 && (
        <div className="card">
          <div className="card-title">Overall pipeline — current active candidates</div>
          <div className="text-[11px] text-text-2 mb-3">
            Point-in-time count of active candidates at each stage · green ≥ planned conversion · amber within 20% · red below
          </div>
          <FunnelVizH
            stageDefs={STAGE_DEFS}
            bands={actualsBands}
            convRates={funnelConvRates}
            mode="actuals"
          />
        </div>
      )}

      {actualsBands.length === 0 && (
        <div className="card">
          <div className="card-title">Overall pipeline</div>
          <div className="text-center py-8 text-text-2 text-sm">
            No active candidate data yet — click Refresh to load from Google Sheets.
          </div>
        </div>
      )}
    </div>
  );
}
