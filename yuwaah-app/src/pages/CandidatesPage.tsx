import { useState, useMemo } from 'react';
import type { DataState } from '../types';
import { STAGE_DEFS, SHEET_ID } from '../constants';

interface CandidatesPageProps {
  data: DataState;
}

const STATE_LABELS: Record<string, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
const STATE_COLORS: Record<string, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };
const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGE_DEFS.map((s) => [s.key, s.label]));

function stagePillStyle(order: number, dropped: boolean): { bg: string; text: string; border: string } {
  if (dropped) return { bg: '#280A0A', text: '#F07070', border: '#A03030' };
  if (order >= 11) return { bg: '#0A2B22', text: '#3ECBA8', border: '#1A5040' };
  if (order >= 9) return { bg: '#0D2A3A', text: '#4A9AE8', border: '#1A4060' };
  if (order >= 6) return { bg: '#241A08', text: '#F5B942', border: '#5A4010' };
  if (order >= 3) return { bg: '#0F1E36', text: '#7B96B8', border: '#1E3356' };
  return { bg: '#0F1E36', text: '#4D6A88', border: '#162840' };
}

// ── Setup instructions shown when no data is loaded yet ────────────────────
function SetupGuide() {
  return (
    <div className="card">
      <div className="card-title">Candidate tracker — setup</div>

      <div className="bg-amber-bg border-l-4 border-nudge-border px-4 py-3 rounded-r text-[12px] text-amber-custom mb-5">
        <strong>Sheet not yet connected.</strong> Follow the steps below, then update
        the <code className="bg-bg-3 px-1 rounded">CANDIDATES_GID</code> placeholder in{' '}
        <code className="bg-bg-3 px-1 rounded">src/constants/index.ts</code>.
      </div>

      <div className="space-y-5 text-[12px] text-text-2">

        {/* Step 1 */}
        <div>
          <p className="font-semibold text-text mb-1">Step 1 — Add a Candidates tab to your Google Sheet</p>
          <p>Open the dashboard Google Sheet, click the <strong>+</strong> at the bottom, name the tab <strong>Candidates</strong>.</p>
        </div>

        {/* Step 2 */}
        <div>
          <p className="font-semibold text-text mb-2">Step 2 — Paste your tracker data</p>
          <p className="mb-2">
            Your existing tracker has three state tabs (<strong>Odisha</strong>, <strong>Rajasthan</strong>, <strong>Jharkhand</strong>).
            Copy all rows from each into the Candidates tab. The parser recognises the original column headers automatically — no renaming needed.
          </p>
          <div className="bg-bg-2 border border-border rounded-md p-3 overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  {['Col', 'Header (exact)', 'Notes'].map((h) => (
                    <th key={h} className="text-left p-1 px-2 text-text-3 uppercase tracking-wide border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['A', 'Project ID / SAHI Center ID', ''],
                  ['B', 'SAHI Batch', ''],
                  ['C', 'Candidate ID', 'e.g. 3000 1000 1156 9026'],
                  ['D', 'Candidate Name', 'Required — rows without a name are skipped'],
                  ['E', 'DOB', ''],
                  ['F', 'Gender', ''],
                  ['G', 'Contact Number', ''],
                  ['H', 'Qualification', ''],
                  ['I', 'Caste', ''],
                  ['J', 'Mobilisation Date', 'Signals "outreach" stage minimum'],
                  ['K', 'District', ''],
                  ['L', 'State', 'ODISHA · Rajasthan · Jharkhand (auto-mapped to od/rj/jh)'],
                  ['M', 'Pre screening', '"Done" → responded stage'],
                  ['N', 'Date - Wysa (OD/JH) or Date - Counseling (RJ)', 'OD/JH order'],
                  ['O', 'Wysa Session (OD/JH) or Parents Counselling (RJ)', '"Present" → prequalified'],
                  ['P', 'Date - Counseling (OD/JH) or Date - Wysa (RJ)', ''],
                  ['Q', 'Parents Counselling (OD/JH) or Wysa Session (RJ)', '"Done" → parent_approved'],
                  ['R', 'Date - P2E', ''],
                  ['S', 'P2E Certification', '"Done"/"Received" → docs_complete'],
                  ['T-V', 'Enrollment Form · Sahi Enrolled · Sahi Module', 'Stored, not used for stage'],
                  ['W', 'Date - Interview', ''],
                  ['X', 'Job Interview', ''],
                  ['Y', 'Selection Status', '"Selected" → selected stage'],
                  ['Z', 'Offer Letter Status', '"Received" → offer_released'],
                  ['AA', 'Company Name', 'Shown in table'],
                  ['AB', 'Location', 'City shown in table'],
                  ['AC-AE', 'Job Type · Company Scale · Company Recognition', ''],
                  ['AF', 'Current Stage', 'Free text: Migrated / Migration Stage / P2E Certification / …'],
                  ['AG', 'Current Status', '"Active" or "Dropped"'],
                  ['AH', 'Travel Date', ''],
                  ['AI', 'Joining Date', 'Filled → migrated stage'],
                  ['AJ-AP', 'Family Income · Experience · Dropout Stage · Dropout Reason · Salaries · Exit Type', ''],
                  ['AQ', 'Last Follow Up date', 'Shown in table'],
                  ['AR', 'Detailed Remarks', ''],
                ].map(([col, header, note]) => (
                  <tr key={col} className="border-b border-border/40">
                    <td className="p-1 px-2 font-mono text-text-3">{col}</td>
                    <td className="p-1 px-2 text-orange font-mono text-[10px] whitespace-nowrap">{header}</td>
                    <td className="p-1 px-2 text-text-3">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-text-3 text-[11px]">
            ⚠️ RJ columns N–Q are in a different order (Counseling before Wysa).
            The parser reads by column <em>name</em>, so paste from OD/JH as-is.
            For RJ, paste the header row first to set column names, then paste data.
          </p>
        </div>

        {/* Step 3 */}
        <div>
          <p className="font-semibold text-text mb-1">Step 3 — Publish the tab and update the GID</p>
          <ol className="list-decimal list-inside space-y-1 text-text-2">
            <li>File → Share → Publish to web → select <em>Candidates</em> → CSV → Publish</li>
            <li>Copy the <code className="bg-bg-3 px-1 rounded">gid=XXXXXXX</code> from the URL</li>
            <li>In <code className="bg-bg-3 px-1 rounded">src/constants/index.ts</code> replace <code className="bg-bg-3 px-1 rounded">CANDIDATES_GID</code> with that number</li>
          </ol>
        </div>

        {/* Step 4 — Actuals formulas */}
        <div>
          <p className="font-semibold text-text mb-1">Step 4 — Auto-calculate Actuals from candidate counts (optional)</p>
          <p className="mb-2 text-text-2">
            Add a computed column to the Candidates tab (e.g. column AS) with this formula in AS2, dragged down:
          </p>
          <div className="bg-bg-2 border border-border rounded-md p-3 font-mono text-[10px] text-[#3ECBA8] leading-relaxed overflow-x-auto whitespace-nowrap">
            =IF(OR(AF2="Migrated",AI2&lt;&gt;""),11,IF(OR(AF2="Migration Stage",Z2="Received"),10,IF(Y2="Selected",9,IF(W2&lt;&gt;"",8,IF(OR(S2="Done",S2="Received"),7,IF(OR(Q2="Done",AF2="Parent Counseling"),6,IF(OR(P2&lt;&gt;"",AF2="Registration"),5,IF(OR(O2="Present",N2&lt;&gt;"",AF2="WYSA session"),4,IF(M2="Done",3,IF(J2&lt;&gt;"",2,1))))))))))
          </div>
          <p className="mt-2 mb-2 text-text-2">Then replace manual numbers in the Actuals tab with these COUNTIFS (adjust AS column letter if needed):</p>
          <div className="bg-bg-2 border border-border rounded-md p-3 font-mono text-[10px] text-text-2 leading-relaxed overflow-x-auto">
            {STAGE_DEFS.map((s, i) => (
              <div key={s.key} className="mb-0.5">
                <span className="text-orange">{s.key}</span>
                {' rj_actual → '}
                <span className="text-[#3ECBA8]">
                  {`=COUNTIFS(Candidates!L:L,"Rajasthan",Candidates!AS:AS,">="&${i + 1})`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-text-3 text-[11px]">Repeat with "ODISHA" and "Jharkhand" for od_actual / jh_actual columns.</p>
        </div>

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

// ── Main candidates table ──────────────────────────────────────────────────
export function CandidatesPage({ data }: CandidatesPageProps) {
  const { candidates } = data;
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'name' | 'state' | 'stage' | 'followup'>('stage');
  const [sortAsc, setSortAsc] = useState(false);

  if (candidates.length === 0) return <SetupGuide />;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates
      .filter((c) => {
        if (stateFilter !== 'all' && c.state !== stateFilter) return false;
        if (stageFilter !== 'all' && c.stage !== stageFilter) return false;
        if (statusFilter === 'active' && c.currentStatus.toLowerCase() !== 'active') return false;
        if (statusFilter === 'dropped' && c.currentStatus.toLowerCase() !== 'dropped') return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q) && !c.district.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'state') cmp = a.state.localeCompare(b.state);
        else if (sortKey === 'stage') cmp = a.stageOrder - b.stageOrder;
        else if (sortKey === 'followup') cmp = a.lastFollowup.localeCompare(b.lastFollowup);
        return sortAsc ? cmp : -cmp;
      });
  }, [candidates, search, stateFilter, stageFilter, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };
  const arrow = (key: typeof sortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  // Summary
  const total = candidates.length;
  const countBy = (st: string) => candidates.filter((c) => c.state === st).length;
  const migratedBy = (st: string) => candidates.filter((c) => c.state === st && c.stage === 'migrated').length;
  const dropped = candidates.filter((c) => c.currentStatus.toLowerCase() === 'dropped').length;

  return (
    <div className="card">
      <div className="card-title">Candidate tracker</div>

      {/* Summary bar */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3 mb-5">
        <div className="bg-bg-2 border border-border rounded-lg p-3 px-4">
          <div className="text-[22px] font-semibold tracking-tight">{total}</div>
          <div className="text-[11px] text-text-2 mt-0.5">Total · {dropped} dropped</div>
        </div>
        {(['rj', 'od', 'jh'] as const).map((st) => (
          <div key={st} className="bg-bg-2 border border-border rounded-lg p-3 px-4">
            <div className="text-[22px] font-semibold tracking-tight" style={{ color: STATE_COLORS[st] }}>
              {countBy(st)}
            </div>
            <div className="text-[11px] text-text-2 mt-0.5">
              {STATE_LABELS[st]} · {migratedBy(st)} migrated
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center mb-4">
        <input
          type="text"
          placeholder="Search name, phone, district…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-xs px-3 py-1.5 w-52 flex-shrink-0"
        />
        <div className="flex gap-1 flex-wrap">
          {[{ v: 'all', label: 'All states' }, { v: 'rj', label: 'Rajasthan' }, { v: 'od', label: 'Odisha' }, { v: 'jh', label: 'Jharkhand' }].map((o) => (
            <button
              key={o.v}
              onClick={() => setStateFilter(o.v)}
              className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer font-sans transition-all duration-150 ${
                stateFilter === o.v ? 'bg-orange text-white border-orange font-medium' : 'bg-bg-3 border-border text-text-2 hover:border-orange hover:text-orange'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="input text-xs px-2 py-1.5">
          <option value="all">All stages</option>
          {STAGE_DEFS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs px-2 py-1.5">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="dropped">Dropped</option>
        </select>
        {(search || stateFilter !== 'all' || stageFilter !== 'all' || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStateFilter('all'); setStageFilter('all'); setStatusFilter('all'); }} className="text-[11px] text-text-3 hover:text-orange cursor-pointer">
            ✕ Clear
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
                { key: 'state' as const, label: 'State / District' },
                { key: null, label: 'Qual.' },
                { key: 'stage' as const, label: 'Pipeline stage' },
                { key: null, label: 'Status' },
                { key: null, label: 'Employer / City' },
                { key: 'followup' as const, label: 'Last follow-up' },
                { key: null, label: 'Remarks' },
              ].map(({ key, label }) => (
                <th
                  key={label}
                  onClick={key ? () => toggleSort(key) : undefined}
                  className={`text-left p-1.5 px-2.5 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase whitespace-nowrap ${key ? 'cursor-pointer hover:text-text select-none' : ''}`}
                >
                  {label}{key ? arrow(key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-4 text-center text-text-3 text-[12px]">No candidates match.</td></tr>
            ) : filtered.map((c) => {
              const dropped = c.currentStatus.toLowerCase() === 'dropped';
              const ps = stagePillStyle(c.stageOrder, dropped);
              return (
                <tr key={c.id} className="border-b border-border/40 hover:bg-bg-3/40 transition-colors">
                  <td className="p-1.5 px-2.5 font-medium text-text whitespace-nowrap">{c.name}</td>
                  <td className="p-1.5 px-2.5 text-text-2 font-mono text-[10px] whitespace-nowrap">{c.phone || '—'}</td>
                  <td className="p-1.5 px-2.5 whitespace-nowrap">
                    <span className="text-[10px] font-semibold" style={{ color: STATE_COLORS[c.state] || '#7B96B8' }}>
                      {STATE_LABELS[c.state] || c.state}
                    </span>
                    {c.district && <span className="text-text-3 text-[10px]"> · {c.district}</span>}
                  </td>
                  <td className="p-1.5 px-2.5 text-text-2 whitespace-nowrap">{c.qualification || '—'}</td>
                  <td className="p-1.5 px-2.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap"
                      style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}
                    >
                      {STAGE_LABEL[c.stage] ?? c.stage}
                    </span>
                  </td>
                  <td className="p-1.5 px-2.5">
                    {c.currentStatus ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dropped ? 'text-[#F07070]' : 'text-[#3ECBA8]'}`}>
                        {c.currentStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-1.5 px-2.5 text-text-2 whitespace-nowrap">
                    {c.employer || '—'}{c.city && <span className="text-text-3"> · {c.city}</span>}
                  </td>
                  <td className="p-1.5 px-2.5 text-text-3 whitespace-nowrap">{c.lastFollowup || '—'}</td>
                  <td className="p-1.5 px-2.5 text-text-3 max-w-[160px] truncate" title={c.remarks}>{c.remarks || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
