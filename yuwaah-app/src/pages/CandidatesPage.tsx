import { useState, useMemo } from 'react';
import type { DataState } from '../types';
import { STAGE_DEFS, SHEET_ID } from '../constants';

interface CandidatesPageProps {
  data: DataState;
}

const STATE_LABELS: Record<string, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
const STATE_COLORS: Record<string, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };

const STAGE_ORDER = STAGE_DEFS.map((s) => s.key);
const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGE_DEFS.map((s) => [s.key, s.label]));

function stagePillClass(order: number): string {
  if (order >= 11) return 'bg-green-bg border border-green-border text-green-DEFAULT';
  if (order >= 7) return 'bg-[#0D2A3A] border border-[#1A5060] text-[#3ECBA8]';
  if (order >= 4) return 'bg-amber-bg border border-nudge-border text-amber-custom';
  if (order >= 1) return 'bg-bg-3 border border-border text-text-2';
  return 'bg-bg-3 border border-border text-text-3';
}

export function CandidatesPage({ data }: CandidatesPageProps) {
  const { candidates } = data;
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'name' | 'state' | 'stage' | 'updated'>('stage');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates
      .filter((c) => {
        if (stateFilter !== 'all' && c.state !== stateFilter) return false;
        if (stageFilter !== 'all' && c.stage !== stageFilter) return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'state') cmp = a.state.localeCompare(b.state);
        else if (sortKey === 'stage') cmp = a.stageOrder - b.stageOrder;
        else if (sortKey === 'updated') cmp = a.lastUpdated.localeCompare(b.lastUpdated);
        return sortAsc ? cmp : -cmp;
      });
  }, [candidates, search, stateFilter, stageFilter, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };
  const sortArrow = (key: typeof sortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  // Summary counts
  const total = candidates.length;
  const byState = { rj: 0, od: 0, jh: 0 };
  const migrated = { rj: 0, od: 0, jh: 0 };
  candidates.forEach((c) => {
    const st = c.state as 'rj' | 'od' | 'jh';
    if (st in byState) byState[st]++;
    if (c.stage === 'migrated' && st in migrated) migrated[st]++;
  });

  if (candidates.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Candidate tracker</div>
        <div className="bg-amber-bg border-l-4 border-nudge-border px-4 py-3 rounded-r text-[12px] text-amber-custom mb-4">
          <strong>Sheet not yet connected.</strong> Add a <code>Candidates</code> tab to your Google Sheet,
          publish it, then update the <code>CANDIDATES_GID</code> placeholder in <code>src/constants/index.ts</code>.
        </div>
        <div className="text-[12px] text-text-2 space-y-1.5">
          <p className="font-medium text-text">Required columns in the sheet (row 1 = header):</p>
          <table className="w-full border-collapse text-xs mt-2">
            <thead>
              <tr>{['Column', 'Header value', 'Example'].map((h) => (
                <th key={h} className="text-left p-1.5 px-3 text-[10px] font-semibold text-text-3 border-b border-border uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[
                ['A', 'candidate_id', 'C001'],
                ['B', 'name', 'Priya Devi'],
                ['C', 'phone', '9876543210'],
                ['D', 'state', 'rj · od · jh'],
                ['E', 'current_stage', 'counselled'],
                ['F', 'stage_order', '=IFERROR(MATCH(E2,{"leads","outreach","responded","prequalified","counselled","parent_approved","docs_complete","interview","selected","offer_released","migrated"},0),0)'],
                ['G', 'employer', 'Manyavar'],
                ['H', 'last_updated', '2026-05-20'],
                ['I', 'notes', 'optional'],
              ].map(([col, header, ex]) => (
                <tr key={col} className="border-b border-border/50">
                  <td className="p-1.5 px-3 text-text-3 font-mono">{col}</td>
                  <td className="p-1.5 px-3 text-orange font-mono text-[11px]">{header}</td>
                  <td className="p-1.5 px-3 text-text-2 text-[11px]">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-medium text-text">Then update Actuals tab with COUNTIF formulas so stage counts auto-calculate:</p>
          <div className="bg-bg-2 border border-border rounded-md p-3 font-mono text-[10px] text-text-2 leading-relaxed mt-1 overflow-x-auto whitespace-nowrap">
            {STAGE_ORDER.map((key, i) => (
              <div key={key}>
                <span className="text-orange">{key}</span>{' → rj: '}
                <span className="text-[#3ECBA8]">{i === 0 ? `=COUNTIF(Candidates!D:D,"rj")` : `=COUNTIFS(Candidates!D:D,"rj",Candidates!F:F,">="&${i + 1})`}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-text-3 text-[11px]">Repeat the same pattern for "od" and "jh" in the od_actual and jh_actual columns.</p>
        </div>
        <div className="mt-4 text-[11px] text-text-2">
          Open sheet:{' '}
          <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noreferrer" className="text-orange">
            Google Sheets ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Candidate tracker</div>

      {/* Summary bar */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3 mb-5">
        <div className="bg-bg-2 border border-border rounded-lg p-3 px-4">
          <div className="text-[22px] font-semibold tracking-tight">{total}</div>
          <div className="text-[11px] text-text-2 mt-0.5">Total candidates</div>
        </div>
        {(['rj', 'od', 'jh'] as const).map((st) => (
          <div key={st} className="bg-bg-2 border border-border rounded-lg p-3 px-4">
            <div className="text-[22px] font-semibold tracking-tight" style={{ color: STATE_COLORS[st] }}>
              {byState[st]}
            </div>
            <div className="text-[11px] text-text-2 mt-0.5">
              {STATE_LABELS[st]} · {migrated[st]} migrated
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center mb-4">
        <input
          type="text"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-xs px-3 py-1.5 w-48 flex-shrink-0"
        />
        <div className="flex gap-1 flex-wrap">
          {[{ v: 'all', label: 'All states' }, { v: 'rj', label: 'Rajasthan' }, { v: 'od', label: 'Odisha' }, { v: 'jh', label: 'Jharkhand' }].map((o) => (
            <button
              key={o.v}
              onClick={() => setStateFilter(o.v)}
              className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer font-sans transition-all duration-150 ${
                stateFilter === o.v
                  ? 'bg-orange text-white border-orange font-medium'
                  : 'bg-bg-3 border-border text-text-2 hover:border-orange hover:text-orange'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="input text-xs px-2 py-1.5 flex-shrink-0"
        >
          <option value="all">All stages</option>
          {STAGE_DEFS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        {(search || stateFilter !== 'all' || stageFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStateFilter('all'); setStageFilter('all'); }}
            className="text-[11px] text-text-3 hover:text-orange cursor-pointer"
          >
            ✕ Clear filters
          </button>
        )}
        <span className="ml-auto text-[11px] text-text-3">{filtered.length} of {total}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {[
                { key: 'name' as const, label: 'Name' },
                { key: null, label: 'Phone' },
                { key: 'state' as const, label: 'State' },
                { key: 'stage' as const, label: 'Current stage' },
                { key: null, label: 'Employer' },
                { key: 'updated' as const, label: 'Updated' },
                { key: null, label: 'Notes' },
              ].map(({ key, label }, i) => (
                <th
                  key={label}
                  onClick={key ? () => toggleSort(key) : undefined}
                  className={`text-left p-1.5 px-2.5 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase ${
                    key ? 'cursor-pointer hover:text-text select-none' : ''
                  } ${i > 0 ? '' : ''}`}
                >
                  {label}{key ? sortArrow(key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-text-3 text-[12px]">No candidates match the current filters.</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-bg-3/40 transition-colors">
                  <td className="p-1.5 px-2.5 font-medium text-text">{c.name}</td>
                  <td className="p-1.5 px-2.5 text-text-2 font-mono">{c.phone || '—'}</td>
                  <td className="p-1.5 px-2.5">
                    {c.state ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: STATE_COLORS[c.state] || '#7B96B8', background: 'rgba(255,255,255,0.04)' }}>
                        {(STATE_LABELS[c.state] || c.state).slice(0, 9)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-1.5 px-2.5">
                    {c.stage ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stagePillClass(c.stageOrder)}`}>
                        {STAGE_LABEL[c.stage] ?? c.stage}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-1.5 px-2.5 text-text-2">{c.employer || '—'}</td>
                  <td className="p-1.5 px-2.5 text-text-3 whitespace-nowrap">{c.lastUpdated || '—'}</td>
                  <td className="p-1.5 px-2.5 text-text-3 max-w-[180px] truncate" title={c.notes}>{c.notes || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
