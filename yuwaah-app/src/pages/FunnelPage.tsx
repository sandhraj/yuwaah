import { useState } from 'react';
import type { DataState, StateView, WeeklyTarget } from '../types';
import { STAGE_DEFS, CONV_ORDER, SHEET_ID } from '../constants';
import { getFunnelBackCalc, calcConv, computeCalendarWeeks } from '../utils';
import { FunnelVizH } from '../components/FunnelVizH';
import type { FunnelBand, ConvRate } from '../components/FunnelVizH';

interface FunnelPageProps {
  data: DataState;
  view: StateView;
  gsStatus: string;
  endDate: string;
}

const STATE_COLOR: Record<string, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };
const STATE_LABEL: Record<string, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
const STATES = ['rj', 'od', 'jh'] as const;

type StateKey = 'rj' | 'od' | 'jh';

function getWeeklyTargetForState(
  weekStart: string,
  state: StateKey,
  weeklyTargets: WeeklyTarget[],
  targets: { rj: number; od: number; jh: number },
  totalWeeks: number,
): number {
  const sheet = weeklyTargets.find((w) => w.week_start === weekStart);
  if (sheet) return sheet[state];
  return Math.ceil(targets[state] / (totalWeeks || 1));
}

export function FunnelPage({ data, view, gsStatus, endDate }: FunnelPageProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('overall');

  const weeks = computeCalendarWeeks(endDate);
  const totalWeeks = weeks.length || 1;
  const visibleStates: StateKey[] = view === 'all' ? [...STATES] : [view as StateKey];

  // --- Planning target for selected period ---
  const planningTarget = (() => {
    if (selectedWeek === 'overall') {
      return visibleStates.reduce((s, st) => s + (data.targets[st] || 0), 0);
    }
    return visibleStates.reduce(
      (s, st) => s + getWeeklyTargetForState(selectedWeek, st, data.weeklyTargets, data.targets, totalWeeks),
      0,
    );
  })();

  // Back-calculated planning funnel
  const planStages = getFunnelBackCalc(planningTarget, data.conv);
  const planBands: FunnelBand[] = [
    { id: 'planned', label: 'Required pipeline', color: '#E8601C', stages: planStages },
  ];
  const planConvRates: ConvRate[] = CONV_ORDER.map((key) => ({
    actual: null,
    planned: data.conv[key] ?? null,
  }));

  // --- Actuals bands ---
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

  const actualsConvRates: ConvRate[] = CONV_ORDER.map((key, i) => ({
    actual: calcConv(combinedActuals as Record<string, number | null>, STAGE_DEFS[i].key, STAGE_DEFS[i + 1].key),
    planned: data.conv[key] ?? null,
  }));

  // State-wise breakdown table
  const stateRows = STATES.map((st) => {
    const a = data.actuals[st] || {};
    const leads = a.leads != null ? Number(a.leads) : null;
    const migrated = a.migrated != null ? Number(a.migrated) : null;
    const tgt = data.targets[st] || 0;
    const conv = leads && migrated ? ((migrated / leads) * 100).toFixed(1) + '%' : '—';
    const pct = migrated != null ? Math.round((migrated / tgt) * 100) : null;
    const pc = pct != null ? (pct >= 100 ? 'pill-good' : pct >= 80 ? 'pill-warn' : 'pill-bad') : 'pill-na';
    const gap = migrated != null ? tgt - migrated : null;
    return (
      <tr key={st}>
        <td className="font-medium" style={{ color: STATE_COLOR[st] }}>{STATE_LABEL[st]}</td>
        <td className="text-right">{leads != null ? leads.toLocaleString() : '—'}</td>
        <td className="text-right">{migrated != null ? migrated.toLocaleString() : '—'}</td>
        <td className="text-right">{tgt}</td>
        <td className="text-right">
          <span className={`pill ${pc}`}>{pct != null ? pct + '%' : '—'}</span>
        </td>
        <td className="text-right text-text-2 text-[11px]">
          {gap != null ? (gap <= 0 ? '✓' : `−${gap}`) : '—'}
        </td>
        <td className="text-right">{conv}</td>
      </tr>
    );
  });

  const selectedWeekLabel = selectedWeek === 'overall'
    ? 'Overall project'
    : weeks.find((w) => w.week_start === selectedWeek)?.label ?? selectedWeek;

  return (
    <div className="space-y-4">

      {/* Week selector bar */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-2 whitespace-nowrap">Planning period:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-border rounded-md px-2.5 py-1.5 text-xs bg-bg-2 text-text cursor-pointer"
            >
              <option value="overall">Overall project</option>
              {weeks.map((w) => (
                <option key={w.week_start} value={w.week_start}>
                  {w.isCurrent ? '→ ' : w.isPast ? '✓ ' : ''}W{w.weekNum}: {w.label}
                  {w.isCurrent ? ' (this week)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-2">
            <span>
              Migration target for this period:{' '}
              <strong className="text-text">{planningTarget.toLocaleString()}</strong>
            </span>
            {selectedWeek !== 'overall' && visibleStates.length > 1 && (
              <span className="text-text-3">
                ({visibleStates.map((st) => `${st.toUpperCase()}: ${getWeeklyTargetForState(selectedWeek, st, data.weeklyTargets, data.targets, totalWeeks)}`).join(' · ')})
              </span>
            )}
          </div>
          <span className="ml-auto text-[10px] text-text-3">
            {gsStatus === 'live' ? '🟢 Live' : 'Cached'}
          </span>
        </div>
      </div>

      {/* Side by side: Planning | Actuals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Planning panel */}
        <div className="card">
          <div className="card-title">Planning — required pipeline</div>
          <div className="text-[11px] text-text-2 mb-1">
            <span className="font-medium text-orange">{selectedWeekLabel}</span> · target: {planningTarget.toLocaleString()} migrations
          </div>
          <div className="text-[11px] text-text-3 mb-3">
            Back-calculated from migration target using planned stage conversion ratios
          </div>
          <FunnelVizH
            stageDefs={STAGE_DEFS}
            bands={planBands}
            convRates={planConvRates}
            mode="planning"
          />
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-[10px] text-text-3 mb-2 font-medium uppercase tracking-wider">Required counts at each stage</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {STAGE_DEFS.map((s, i) => (
                <div key={s.key} className="flex justify-between text-[11px]">
                  <span className="text-text-2">{s.label}</span>
                  <span className="font-medium text-orange">{planStages[i].toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actuals panel */}
        <div className="card">
          <div className="card-title">Current pipeline — active candidates</div>
          <div className="text-[11px] text-text-2 mb-1">
            Point-in-time count of active candidates at each stage
          </div>
          <div className="text-[11px] text-text-3 mb-3">
            Only Active status candidates counted · green ≥ planned · amber within 20% · red below
          </div>
          {actualsBands.length > 0 ? (
            <FunnelVizH
              stageDefs={STAGE_DEFS}
              bands={actualsBands}
              convRates={actualsConvRates}
              mode="actuals"
            />
          ) : (
            <div className="text-center py-12 text-text-2 text-sm">
              No active candidate data yet — click Refresh to load.
            </div>
          )}
          {actualsBands.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-[10px] text-text-3 mb-2 font-medium uppercase tracking-wider">Active candidates by stage</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {STAGE_DEFS.map((s) => {
                  const tot = visibleStates.reduce((sum, st) => sum + Number(data.actuals[st]?.[s.key] ?? 0), 0);
                  return (
                    <div key={s.key} className="flex justify-between text-[11px]">
                      <span className="text-text-2">{s.label}</span>
                      <span className="font-medium">{tot > 0 ? tot.toLocaleString() : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* State breakdown */}
      <div className="card">
        <div className="card-title">State-wise breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['State', 'Active leads', 'Migrated', 'Target', '% Target', 'Gap', 'Conv.'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left p-1.5 px-2.5 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase ${i > 0 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{stateRows}</tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] text-text-2">
          Actuals sourced from active candidates in state tracker sheets ·{' '}
          <a
            href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-orange"
          >
            Open Sheets ↗
          </a>
        </div>
      </div>
    </div>
  );
}
