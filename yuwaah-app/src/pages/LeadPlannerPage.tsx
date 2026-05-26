import { useState, useCallback, useMemo } from 'react';
import type { StateView } from '../types';
import { computeCalendarWeeks } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CorridorKey = 'rj' | 'od' | 'jh';

interface LeadPlanSource {
  id: string;
  name: string;
  convRateOverride?: number;
  cplOverride?: number;
  isCustom?: boolean;
}

interface LeadPlanGroup {
  id: string;
  label: string;
  convRate: number;
  hasCpl: boolean;
  defaultCpl: number;
  sources: LeadPlanSource[];
}

interface LeadPlanWeekDetail {
  sectionA: Record<string, { contacts: number; convRate: number }>;
  sectionC: Record<string, { leadsToBuy: number; cpl: number }>;
}

interface LeadPlan {
  corridors: Record<CorridorKey, { target: number; startWeek: number }>;
  groups: LeadPlanGroup[];
  weekDetails: Record<string, LeadPlanWeekDetail>;
  planGenerated: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CORRIDOR_LABELS: Record<CorridorKey, string> = {
  rj: 'Rajasthan → Delhi NCR',
  od: 'Odisha → Bengaluru',
  jh: 'Jharkhand → Bengaluru',
};
const CORRIDOR_SHORT: Record<CorridorKey, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
const CORRIDOR_COLOR: Record<CorridorKey, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };
const CORRIDORS: CorridorKey[] = ['rj', 'od', 'jh'];

const DEFAULT_GROUPS: LeadPlanGroup[] = [
  {
    id: 'field', label: 'Field outreach', convRate: 8, hasCpl: false, defaultCpl: 0,
    sources: [
      { id: 'rsdsl', name: 'RSDSL' },
      { id: 'job_drives', name: 'Job drives' },
      { id: 'door_to_door', name: 'Door-to-door' },
      { id: 'employer_referrals', name: 'Employer referrals' },
    ],
  },
  {
    id: 'organic', label: 'Organic digital', convRate: 3, hasCpl: false, defaultCpl: 0,
    sources: [
      { id: 'instagram_posts', name: 'Instagram posts/reels' },
      { id: 'facebook_posts', name: 'Facebook posts' },
      { id: 'whatsapp_broadcast', name: 'WhatsApp broadcast' },
    ],
  },
  {
    id: 'paid', label: 'Paid social', convRate: 5, hasCpl: true, defaultCpl: 150,
    sources: [
      { id: 'instagram_ads', name: 'Instagram ads' },
      { id: 'facebook_ads', name: 'Facebook ads' },
    ],
  },
  {
    id: 'vendor', label: 'Data vendors', convRate: 6, hasCpl: true, defaultCpl: 80,
    sources: [
      { id: 'vendor_1', name: 'Vendor 1' },
      { id: 'vendor_2', name: 'Vendor 2' },
    ],
  },
  {
    id: 'portal', label: 'Job portals', convRate: 4, hasCpl: false, defaultCpl: 0,
    sources: [
      { id: 'naukri', name: 'Naukri' },
      { id: 'apna', name: 'Apna' },
      { id: 'workindia', name: 'WorkIndia' },
    ],
  },
];

const DEFAULT_PLAN: LeadPlan = {
  corridors: { rj: { target: 280, startWeek: 1 }, od: { target: 200, startWeek: 1 }, jh: { target: 120, startWeek: 1 } },
  groups: DEFAULT_GROUPS,
  weekDetails: {},
  planGenerated: false,
};

const LS_KEY = 'yw_lead_plan';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadPlan(): LeadPlan {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) {
      const p = JSON.parse(s) as Partial<LeadPlan>;
      return {
        corridors: p.corridors ?? DEFAULT_PLAN.corridors,
        groups: p.groups ?? JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
        weekDetails: p.weekDetails ?? {},
        planGenerated: p.planGenerated ?? false,
      };
    }
  } catch (_) {}
  return { ...DEFAULT_PLAN, groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)) };
}

function savePlan(plan: LeadPlan): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(plan)); } catch (_) {}
}

function weekKey(weekNum: number, corridor: CorridorKey): string {
  return `W${weekNum}_${corridor}`;
}

function getEffectiveConvRate(groups: LeadPlanGroup[]): number {
  const rates = groups.map((g) => g.convRate).filter((r) => r > 0);
  if (!rates.length) return 5;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function sourceConvRate(source: LeadPlanSource, group: LeadPlanGroup): number {
  return source.convRateOverride ?? group.convRate;
}

function sourceCpl(source: LeadPlanSource, group: LeadPlanGroup): number {
  return source.cplOverride ?? group.defaultCpl;
}

function getLeadsPlanned(detail: LeadPlanWeekDetail | undefined, groups: LeadPlanGroup[]): number {
  if (!detail) return 0;
  let total = 0;
  for (const group of groups.filter((g) => !g.hasCpl)) {
    for (const source of group.sources) {
      const a = detail.sectionA[source.id];
      if (a) total += Math.round((a.contacts || 0) * ((a.convRate ?? sourceConvRate(source, group)) / 100));
    }
  }
  for (const group of groups.filter((g) => g.hasCpl)) {
    for (const source of group.sources) {
      const c = detail.sectionC[source.id];
      if (c) total += c.leadsToBuy || 0;
    }
  }
  return total;
}

function gapPillClass(gap: number, required: number): string {
  if (!required) return 'pill-na';
  if (gap <= 0) return 'pill-good';
  if (gap <= required * 0.3) return 'pill-warn';
  return 'pill-bad';
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupScreenProps {
  plan: LeadPlan;
  endDate: string;
  setEndDate: (d: string) => void;
  totalWeeks: number;
  onChange: (plan: LeadPlan) => void;
  onGenerate: () => void;
}

function SetupScreen({ plan, endDate, setEndDate, totalWeeks, onChange, onGenerate }: SetupScreenProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(['field', 'organic', 'paid', 'vendor', 'portal'])
  );
  const [newSourceName, setNewSourceName] = useState<Record<string, string>>({});

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const updateCorridor = (key: CorridorKey, field: 'target' | 'startWeek', value: number) =>
    onChange({ ...plan, corridors: { ...plan.corridors, [key]: { ...plan.corridors[key], [field]: value } } });

  const updateGroupConvRate = (groupId: string, value: number) =>
    onChange({ ...plan, groups: plan.groups.map((g) => g.id === groupId ? { ...g, convRate: value } : g) });

  const updateGroupCpl = (groupId: string, value: number) =>
    onChange({ ...plan, groups: plan.groups.map((g) => g.id === groupId ? { ...g, defaultCpl: value } : g) });

  const updateSourceConv = (groupId: string, sourceId: string, raw: string) => {
    const num = raw === '' ? undefined : Number(raw);
    onChange({
      ...plan,
      groups: plan.groups.map((g) => g.id !== groupId ? g : {
        ...g, sources: g.sources.map((s) => s.id !== sourceId ? s : { ...s, convRateOverride: num }),
      }),
    });
  };

  const updateSourceCplOverride = (groupId: string, sourceId: string, raw: string) => {
    const num = raw === '' ? undefined : Number(raw);
    onChange({
      ...plan,
      groups: plan.groups.map((g) => g.id !== groupId ? g : {
        ...g, sources: g.sources.map((s) => s.id !== sourceId ? s : { ...s, cplOverride: num }),
      }),
    });
  };

  const addSource = (groupId: string) => {
    const name = (newSourceName[groupId] || '').trim();
    if (!name) return;
    const id = `custom_${groupId}_${Date.now()}`;
    onChange({
      ...plan,
      groups: plan.groups.map((g) => g.id !== groupId ? g : {
        ...g, sources: [...g.sources, { id, name, isCustom: true }],
      }),
    });
    setNewSourceName((prev) => ({ ...prev, [groupId]: '' }));
  };

  const removeSource = (groupId: string, sourceId: string) =>
    onChange({
      ...plan,
      groups: plan.groups.map((g) => g.id !== groupId ? g : {
        ...g, sources: g.sources.filter((s) => s.id !== sourceId),
      }),
    });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-title">Program end date</div>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-xs bg-bg-2 text-text cursor-pointer"
          />
          <span className="text-[11px] text-text-2">
            {totalWeeks} calendar week{totalWeeks !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Corridor targets</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Corridor</th>
                <th className="text-left p-2 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Placement target</th>
                <th className="text-left p-2 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Start week</th>
                <th className="text-right p-2 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Active weeks</th>
              </tr>
            </thead>
            <tbody>
              {CORRIDORS.map((key) => {
                const c = plan.corridors[key];
                const active = Math.max(0, totalWeeks - (c.startWeek - 1));
                return (
                  <tr key={key} className="border-b border-border/40">
                    <td className="p-2 font-medium whitespace-nowrap" style={{ color: CORRIDOR_COLOR[key] }}>
                      {CORRIDOR_LABELS[key]}
                    </td>
                    <td className="p-2">
                      <input
                        type="number" min={0} value={c.target}
                        onChange={(e) => updateCorridor(key, 'target', Number(e.target.value))}
                        className="input w-28"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number" min={1} max={totalWeeks || 99} value={c.startWeek}
                        onChange={(e) => updateCorridor(key, 'startWeek', Math.max(1, Number(e.target.value)))}
                        className="input w-20"
                      />
                    </td>
                    <td className="p-2 text-right text-text-2">{active}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Source configuration</div>
        <div className="space-y-3">
          {plan.groups.map((group) => (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-bg-2 hover:bg-bg-3 transition-colors text-left cursor-pointer border-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-text">{group.label}</span>
                  <span className="text-[10px] text-text-3">{group.sources.length} source{group.sources.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-text-3">Conv %</span>
                    <input
                      type="number" min={0} max={100} value={group.convRate}
                      onChange={(e) => updateGroupConvRate(group.id, Number(e.target.value))}
                      className="input w-16 text-center"
                    />
                  </div>
                  {group.hasCpl && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-text-3">Default CPL ₹</span>
                      <input
                        type="number" min={0} value={group.defaultCpl}
                        onChange={(e) => updateGroupCpl(group.id, Number(e.target.value))}
                        className="input w-20 text-center"
                      />
                    </div>
                  )}
                  <span className="text-text-3 text-[10px] w-3">{openGroups.has(group.id) ? '▲' : '▼'}</span>
                </div>
              </button>

              {openGroups.has(group.id) && (
                <div className="px-4 pb-4 pt-2">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-1.5 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Source</th>
                        <th className="text-left p-1.5 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">Conv % override</th>
                        {group.hasCpl && (
                          <th className="text-left p-1.5 text-[10px] font-semibold tracking-widest uppercase text-text-3 border-b border-border">CPL ₹ override</th>
                        )}
                        <th className="p-1.5 border-b border-border" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.sources.map((source) => (
                        <tr key={source.id} className="border-b border-border/30">
                          <td className="p-1.5 text-text">
                            {source.name}
                            {source.isCustom && <span className="ml-1.5 text-[9px] text-text-3">(custom)</span>}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number" min={0} max={100}
                              placeholder={String(group.convRate)}
                              value={source.convRateOverride ?? ''}
                              onChange={(e) => updateSourceConv(group.id, source.id, e.target.value)}
                              className="input w-20 text-center"
                            />
                          </td>
                          {group.hasCpl && (
                            <td className="p-1.5">
                              <input
                                type="number" min={0}
                                placeholder={String(group.defaultCpl)}
                                value={source.cplOverride ?? ''}
                                onChange={(e) => updateSourceCplOverride(group.id, source.id, e.target.value)}
                                className="input w-24 text-center"
                              />
                            </td>
                          )}
                          <td className="p-1.5 text-right">
                            {source.isCustom && (
                              <button
                                onClick={() => removeSource(group.id, source.id)}
                                className="text-[10px] text-red-custom hover:opacity-70 cursor-pointer bg-transparent border-none"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="text"
                      placeholder="Add custom source…"
                      value={newSourceName[group.id] || ''}
                      onChange={(e) => setNewSourceName((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addSource(group.id)}
                      className="input flex-1"
                    />
                    <button onClick={() => addSource(group.id)} className="btn btn-sm">+ Add</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pb-4">
        <button onClick={onGenerate} className="btn btn-primary">
          Generate Plan →
        </button>
      </div>
    </div>
  );
}

// ─── Overview Screen ──────────────────────────────────────────────────────────

type CalendarWeeks = ReturnType<typeof computeCalendarWeeks>;

interface OverviewScreenProps {
  plan: LeadPlan;
  weeks: CalendarWeeks;
  view: StateView;
  onCellClick: (weekNum: number, corridor: CorridorKey) => void;
  onBackToSetup: () => void;
  onExport: () => void;
}

function OverviewScreen({ plan, weeks, view, onCellClick, onBackToSetup, onExport }: OverviewScreenProps) {
  const visibleCorridors: CorridorKey[] = view === 'all' ? CORRIDORS : [view as CorridorKey];
  const convRate = useMemo(() => getEffectiveConvRate(plan.groups), [plan.groups]);

  const weeklyData = useMemo(() => weeks.map((week) => {
    const rowData = {} as Record<CorridorKey, {
      placementTarget: number; leadsRequired: number; leadsPlanned: number; gap: number; active: boolean;
    }>;
    for (const corridor of CORRIDORS) {
      const c = plan.corridors[corridor];
      if (week.weekNum < c.startWeek) {
        rowData[corridor] = { placementTarget: 0, leadsRequired: 0, leadsPlanned: 0, gap: 0, active: false };
        continue;
      }
      const activeWeeks = Math.max(1, weeks.length - (c.startWeek - 1));
      const placementTarget = Math.ceil(c.target / activeWeeks);
      const leadsRequired = Math.ceil(placementTarget / (convRate / 100));
      const detail = plan.weekDetails[weekKey(week.weekNum, corridor)];
      const leadsPlanned = getLeadsPlanned(detail, plan.groups);
      rowData[corridor] = { placementTarget, leadsRequired, leadsPlanned, gap: leadsRequired - leadsPlanned, active: true };
    }
    return { week, rowData };
  }), [plan, weeks, convRate]);

  const summary = useMemo(() => {
    let totalPlacementTarget = 0, totalLeadsRequired = 0, totalPlanned = 0;
    for (const corridor of visibleCorridors) {
      totalPlacementTarget += plan.corridors[corridor].target;
      for (const { rowData } of weeklyData) {
        if (rowData[corridor].active) {
          totalLeadsRequired += rowData[corridor].leadsRequired;
          totalPlanned += rowData[corridor].leadsPlanned;
        }
      }
    }
    return { totalPlacementTarget, totalLeadsRequired, totalPlanned, totalGap: totalLeadsRequired - totalPlanned };
  }, [plan, weeklyData, visibleCorridors]);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Placement target', value: summary.totalPlacementTarget.toLocaleString() },
              { label: 'Leads required', value: summary.totalLeadsRequired.toLocaleString() },
              { label: 'Leads planned', value: summary.totalPlanned.toLocaleString(), dim: summary.totalPlanned === 0 },
            ].map(({ label, value, dim }) => (
              <div key={label}>
                <div className="text-[11px] text-text-2 mb-1">{label}</div>
                <div className={`text-2xl font-semibold ${dim ? 'text-text-3' : ''}`}>{value}</div>
              </div>
            ))}
            <div>
              <div className="text-[11px] text-text-2 mb-1">Total gap</div>
              <div className={`text-2xl font-semibold ${summary.totalGap > 0 ? 'text-red-custom' : 'text-green'}`}>
                {summary.totalGap > 0 ? `+${summary.totalGap.toLocaleString()}` : summary.totalGap.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onBackToSetup} className="btn btn-sm">← Edit setup</button>
            <button onClick={onExport} className="btn btn-sm">↓ Export JSON</button>
          </div>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="card">
          <div className="text-center py-8 text-text-2 text-sm">
            No calendar weeks found. Check the program end date in Setup.
          </div>
        </div>
      ) : (
        <div className="bg-bg border border-border rounded-lg mb-4 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 px-4 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Week</th>
                  <th className="text-left p-3 px-4 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Dates</th>
                  {visibleCorridors.map((c) => (
                    <th key={c} className="text-left p-3 px-4 text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap min-w-[180px]" style={{ color: CORRIDOR_COLOR[c] }}>
                      {CORRIDOR_SHORT[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyData.map(({ week, rowData }) => (
                  <tr key={week.weekNum} className={`border-b border-border/30 ${week.isCurrent ? 'bg-orange/[0.04]' : ''}`}>
                    <td className="p-3 px-4 whitespace-nowrap font-medium text-text-2">
                      W{week.weekNum}
                      {week.isCurrent && (
                        <span className="ml-1.5 text-[9px] bg-orange/20 text-orange px-1 py-0.5 rounded">Now</span>
                      )}
                    </td>
                    <td className="p-3 px-4 whitespace-nowrap text-text-3 text-[11px]">{week.label}</td>
                    {visibleCorridors.map((corridor) => {
                      const d = rowData[corridor];
                      if (!d.active) {
                        return (
                          <td key={corridor} className="p-3 px-4">
                            <span className="text-[10px] text-text-3 italic">Not started</span>
                          </td>
                        );
                      }
                      return (
                        <td key={corridor} className="p-3 px-4">
                          <button
                            onClick={() => onCellClick(week.weekNum, corridor)}
                            className="text-left w-full hover:bg-bg-3 rounded-md p-2 -m-2 transition-colors cursor-pointer border-none bg-transparent block"
                          >
                            <div className="text-[10px] text-text-3 mb-0.5">Target: {d.placementTarget} placements</div>
                            <div className="text-[11px] text-text mb-1">Leads req: {d.leadsRequired.toLocaleString()}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-2">Planned: {d.leadsPlanned.toLocaleString()}</span>
                              <span className={`pill ${gapPillClass(d.gap, d.leadsRequired)}`}>
                                {d.gap > 0 ? `−${d.gap}` : d.gap < 0 ? `+${Math.abs(d.gap)}` : '✓'}
                              </span>
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week Detail Modal ────────────────────────────────────────────────────────

interface WeekDetailModalProps {
  weekNum: number;
  corridor: CorridorKey;
  plan: LeadPlan;
  weeks: CalendarWeeks;
  onSave: (detail: LeadPlanWeekDetail) => void;
  onClose: () => void;
}

function WeekDetailModal({ weekNum, corridor, plan, weeks, onSave, onClose }: WeekDetailModalProps) {
  const week = weeks.find((w) => w.weekNum === weekNum);
  const c = plan.corridors[corridor];
  const convRate = getEffectiveConvRate(plan.groups);
  const activeWeeks = Math.max(1, weeks.length - (c.startWeek - 1));
  const placementTarget = Math.ceil(c.target / activeWeeks);
  const leadsRequired = Math.ceil(placementTarget / (convRate / 100));

  const existing = plan.weekDetails[weekKey(weekNum, corridor)];

  const [sectionA, setSectionA] = useState<Record<string, { contacts: number; convRate: number }>>(() => {
    const init: Record<string, { contacts: number; convRate: number }> = {};
    for (const group of plan.groups.filter((g) => !g.hasCpl)) {
      for (const source of group.sources) {
        const ex = existing?.sectionA[source.id];
        init[source.id] = { contacts: ex?.contacts ?? 0, convRate: ex?.convRate ?? sourceConvRate(source, group) };
      }
    }
    return init;
  });

  const [sectionC, setSectionC] = useState<Record<string, { leadsToBuy: number; cpl: number }>>(() => {
    const init: Record<string, { leadsToBuy: number; cpl: number }> = {};
    for (const group of plan.groups.filter((g) => g.hasCpl)) {
      for (const source of group.sources) {
        const ex = existing?.sectionC[source.id];
        init[source.id] = { leadsToBuy: ex?.leadsToBuy ?? 0, cpl: ex?.cpl ?? sourceCpl(source, group) };
      }
    }
    return init;
  });

  const sectionALeads = useMemo(() => {
    let total = 0;
    for (const group of plan.groups.filter((g) => !g.hasCpl)) {
      for (const source of group.sources) {
        const a = sectionA[source.id];
        if (a) total += Math.round((a.contacts || 0) * ((a.convRate || 0) / 100));
      }
    }
    return total;
  }, [sectionA, plan.groups]);

  const gap = leadsRequired - sectionALeads;

  const sectionCLeads = useMemo(
    () => Object.values(sectionC).reduce((s, c) => s + (c.leadsToBuy || 0), 0),
    [sectionC]
  );
  const sectionCSpend = useMemo(
    () => Object.values(sectionC).reduce((s, c) => s + (c.leadsToBuy || 0) * (c.cpl || 0), 0),
    [sectionC]
  );
  const remainingGap = gap - sectionCLeads;

  const updateA = (sourceId: string, field: 'contacts' | 'convRate', value: number) =>
    setSectionA((prev) => ({ ...prev, [sourceId]: { ...prev[sourceId], [field]: value } }));

  const updateC = (sourceId: string, field: 'leadsToBuy' | 'cpl', value: number) =>
    setSectionC((prev) => ({ ...prev, [sourceId]: { ...prev[sourceId], [field]: value } }));

  const suggestCheapestFill = () => {
    if (gap <= 0) return;
    const ranked: { sourceId: string; cpl: number }[] = [];
    for (const group of plan.groups.filter((g) => g.hasCpl)) {
      for (const source of group.sources) {
        ranked.push({ sourceId: source.id, cpl: sectionC[source.id]?.cpl ?? sourceCpl(source, group) });
      }
    }
    ranked.sort((a, b) => a.cpl - b.cpl);
    const next = { ...sectionC };
    for (const { sourceId } of ranked) next[sourceId] = { ...next[sourceId], leadsToBuy: 0 };
    let remaining = gap;
    for (const { sourceId } of ranked) {
      if (remaining <= 0) break;
      next[sourceId] = { ...next[sourceId], leadsToBuy: remaining };
      remaining = 0;
    }
    setSectionC(next);
  };

  const organicGroups = plan.groups.filter((g) => !g.hasCpl);
  const paidGroups = plan.groups.filter((g) => g.hasCpl);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border sticky top-0 bg-bg z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-text-3 uppercase tracking-widest">Week {weekNum}</span>
              {week && <span className="text-[10px] text-text-3">· {week.label}</span>}
            </div>
            <div className="text-[15px] font-semibold" style={{ color: CORRIDOR_COLOR[corridor] }}>
              {CORRIDOR_LABELS[corridor]}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="text-[11px] text-text-2">Target: <strong className="text-text">{placementTarget} placements</strong></span>
              <span className="text-[11px] text-text-2">Leads needed: <strong className="text-text">{leadsRequired.toLocaleString()}</strong></span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm flex-shrink-0">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Section A */}
          <div>
            <div className="card-title">Section A — Field, organic & portal sources</div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg-2">
                    <th className="text-left p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3">Source</th>
                    <th className="text-left p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3">Group</th>
                    <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Planned contacts</th>
                    <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Conv %</th>
                    <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Projected leads</th>
                  </tr>
                </thead>
                <tbody>
                  {organicGroups.map((group) =>
                    group.sources.map((source) => {
                      const a = sectionA[source.id] ?? { contacts: 0, convRate: group.convRate };
                      const projected = Math.round((a.contacts || 0) * ((a.convRate || 0) / 100));
                      return (
                        <tr key={source.id} className="border-b border-border/30">
                          <td className="p-2 px-3 text-text">{source.name}</td>
                          <td className="p-2 px-3 text-text-3 text-[11px]">{group.label}</td>
                          <td className="p-2 px-3 text-right">
                            <input
                              type="number" min={0}
                              value={a.contacts || ''}
                              placeholder="0"
                              onChange={(e) => updateA(source.id, 'contacts', Number(e.target.value))}
                              className="input w-24 text-right"
                            />
                          </td>
                          <td className="p-2 px-3 text-right">
                            <input
                              type="number" min={0} max={100}
                              value={a.convRate}
                              onChange={(e) => updateA(source.id, 'convRate', Number(e.target.value))}
                              className="input w-16 text-right"
                            />
                          </td>
                          <td className="p-2 px-3 text-right font-medium text-text">{projected.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-bg-2">
                    <td colSpan={4} className="p-2 px-3 text-[11px] font-semibold text-text-2">Total from Section A</td>
                    <td className="p-2 px-3 text-right font-semibold text-text">{sectionALeads.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section B — Gap analysis */}
          <div
            className="border rounded-lg p-4"
            style={{
              borderColor: gap > 0 ? '#E05252' : '#3ECBA8',
              background: gap > 0 ? '#280A0A' : '#0A2B22',
            }}
          >
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mb-3"
              style={{ color: gap > 0 ? '#E05252' : '#3ECBA8' }}
            >
              Section B — Gap analysis
            </div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <div className="text-[11px] text-text-2">Leads needed</div>
                <div className="text-2xl font-semibold">{leadsRequired.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-2">From Section A</div>
                <div className="text-2xl font-semibold">{sectionALeads.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-2">Gap</div>
                <div className="text-3xl font-bold" style={{ color: gap > 0 ? '#E05252' : '#3ECBA8' }}>
                  {gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: gap > 0 ? '#E05252' : '#3ECBA8' }}>
                  {gap > 0 ? 'leads still needed' : 'target covered'}
                </div>
              </div>
            </div>
          </div>

          {/* Section C — Deficit fill */}
          {gap > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="card-title mb-0">Section C — Deficit fill (paid &amp; data)</div>
                <button onClick={suggestCheapestFill} className="btn btn-sm btn-primary">
                  ⚡ Suggest cheapest-first fill
                </button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-2">
                      <th className="text-left p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3">Source</th>
                      <th className="text-left p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3">Group</th>
                      <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">CPL ₹</th>
                      <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Leads to buy</th>
                      <th className="text-right p-2 px-3 text-[10px] font-semibold tracking-widest uppercase text-text-3 whitespace-nowrap">Cost ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidGroups.map((group) =>
                      group.sources.map((source) => {
                        const entry = sectionC[source.id] ?? { leadsToBuy: 0, cpl: group.defaultCpl };
                        const cost = (entry.leadsToBuy || 0) * (entry.cpl || 0);
                        return (
                          <tr key={source.id} className="border-b border-border/30">
                            <td className="p-2 px-3 text-text">{source.name}</td>
                            <td className="p-2 px-3 text-text-3 text-[11px]">{group.label}</td>
                            <td className="p-2 px-3 text-right">
                              <input
                                type="number" min={0}
                                value={entry.cpl}
                                onChange={(e) => updateC(source.id, 'cpl', Number(e.target.value))}
                                className="input w-24 text-right"
                              />
                            </td>
                            <td className="p-2 px-3 text-right">
                              <input
                                type="number" min={0}
                                value={entry.leadsToBuy || ''}
                                placeholder="0"
                                onChange={(e) => updateC(source.id, 'leadsToBuy', Number(e.target.value))}
                                className="input w-24 text-right"
                              />
                            </td>
                            <td className="p-2 px-3 text-right font-medium">
                              {cost > 0 ? `₹${cost.toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-bg-2">
                      <td colSpan={3} className="p-2 px-3 text-[11px] font-semibold text-text-2">Total deficit fill</td>
                      <td className="p-2 px-3 text-right font-semibold">{sectionCLeads.toLocaleString()}</td>
                      <td className="p-2 px-3 text-right font-semibold text-amber-custom">
                        {sectionCSpend > 0 ? `₹${sectionCSpend.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-2.5 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-text-2">Remaining gap after deficit fill:</span>
                          <span className={`pill font-semibold ${remainingGap > 0 ? 'pill-bad' : 'pill-good'}`}>
                            {remainingGap > 0 ? `+${remainingGap.toLocaleString()} still needed` : '✓ Covered'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-bg">
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={() => onSave({ sectionA, sectionC })} className="btn btn-primary">Save ✓</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface LeadPlannerPageProps {
  endDate: string;
  setEndDate: (d: string) => void;
  view: StateView;
}

export function LeadPlannerPage({ endDate, setEndDate, view }: LeadPlannerPageProps) {
  const [plan, setPlan] = useState<LeadPlan>(loadPlan);
  const [screen, setScreen] = useState<'setup' | 'overview'>(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) return (JSON.parse(s) as Partial<LeadPlan>).planGenerated ? 'overview' : 'setup';
    } catch (_) {}
    return 'setup';
  });
  const [modalCell, setModalCell] = useState<{ weekNum: number; corridor: CorridorKey } | null>(null);

  const weeks = useMemo(() => computeCalendarWeeks(endDate), [endDate]);

  const updatePlan = useCallback((updated: LeadPlan) => {
    setPlan(updated);
    savePlan(updated);
  }, []);

  const handleGenerate = () => {
    const updated = { ...plan, planGenerated: true };
    updatePlan(updated);
    setScreen('overview');
  };

  const handleCellSave = (detail: LeadPlanWeekDetail) => {
    if (!modalCell) return;
    const key = weekKey(modalCell.weekNum, modalCell.corridor);
    updatePlan({ ...plan, weekDetails: { ...plan.weekDetails, [key]: detail } });
    setModalCell(null);
  };

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ plan, weeks, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {screen === 'setup' ? (
        <SetupScreen
          plan={plan}
          endDate={endDate}
          setEndDate={setEndDate}
          totalWeeks={weeks.length}
          onChange={updatePlan}
          onGenerate={handleGenerate}
        />
      ) : (
        <OverviewScreen
          plan={plan}
          weeks={weeks}
          view={view}
          onCellClick={(weekNum, corridor) => setModalCell({ weekNum, corridor })}
          onBackToSetup={() => setScreen('setup')}
          onExport={handleExport}
        />
      )}
      {modalCell && (
        <WeekDetailModal
          weekNum={modalCell.weekNum}
          corridor={modalCell.corridor}
          plan={plan}
          weeks={weeks}
          onSave={handleCellSave}
          onClose={() => setModalCell(null)}
        />
      )}
    </>
  );
}
