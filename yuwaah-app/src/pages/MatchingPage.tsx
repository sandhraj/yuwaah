import { useState } from 'react';
import type { DataState, LocalState, MatchSubTab, Employer } from '../types';
import { scoreMatch, renderPitch } from '../utils';

interface MatchingPageProps {
  data: DataState;
  localState: LocalState;
  matchSubTab: MatchSubTab;
  setMatchSubTab: (t: MatchSubTab) => void;
}

export function MatchingPage({ data, localState, matchSubTab, setMatchSubTab }: MatchingPageProps) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [openEmps, setOpenEmps] = useState<Record<string, boolean>>({});
  const [empFilter, setEmpFilter] = useState({ search: '', sector: 'all', corridor: 'all' });

  const toggleEmp = (id: string) => setOpenEmps((prev) => ({ ...prev, [id]: !prev[id] }));

  const getAssigned = (pid: string) => data.assignments[pid] || [];

  const subBtns = (
    <div className="flex gap-1.5 mb-3.5 flex-wrap">
      {(['match', 'employers'] as MatchSubTab[]).map((t) => (
        <button
          key={t}
          className={`text-[11px] px-3 py-1.5 rounded-md border font-sans transition-all duration-150 ${
            matchSubTab === t
              ? 'bg-bg-2 text-text font-medium border-border-2'
              : 'bg-white text-text-2 border-border'
          }`}
          onClick={() => setMatchSubTab(t)}
        >
          {t === 'match' ? 'Profile → Employer' : 'Employer registry'}
        </button>
      ))}
    </div>
  );

  const matchPanel = () => {
    if (!data.profiles.length) {
      return <div className="card"><div className="text-center py-12 text-text-2">No profiles loaded. Click Refresh.</div></div>;
    }

    const pList = data.profiles.map((p) => {
      const assigned = getAssigned(p.id);
      const isSel = selectedProfile === p.id;
      return (
        <div
          key={p.id}
          className={`border rounded-md px-3 py-2.5 cursor-pointer transition-all duration-150 ${
            isSel ? 'border-orange bg-orange-light' : 'border-border hover:border-orange'
          }`}
          onClick={() => setSelectedProfile(selectedProfile === p.id ? null : p.id)}
        >
          <div className="text-xs font-medium">{p.label}</div>
          <div className="text-[11px] text-text-2 mt-0.5">{p.corridor === 'any' ? 'Both corridors' : p.corridor}</div>
          {assigned.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-0.5">
              {assigned.slice(0, 2).map((eid) => {
                const e = data.employers.find((x) => x.id === eid);
                return e ? (
                  <span key={eid} className="text-[9px] bg-green-bg text-green px-1.5 py-0.5 rounded-md">
                    {e.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                ) : null;
              })}
              {assigned.length > 2 && <span className="text-[9px] text-text-3">+{assigned.length - 2}</span>}
            </div>
          )}
        </div>
      );
    });

    let right = (
      <div className="flex items-center justify-center min-h-[220px] text-text-2 text-xs flex-col gap-2">
        <div className="text-3xl">←</div>
        Select a skill profile
      </div>
    );

    if (selectedProfile) {
      const p = data.profiles.find((x) => x.id === selectedProfile);
      if (p) {
        const matches = data.employers
          .map((e) => ({ e, score: scoreMatch(p, e) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        const assigned = getAssigned(p.id);

        const achips = assigned.length > 0 ? (
          <div className="mb-3">
            <div className="text-[11px] font-medium text-text-2 mb-1.5">Assigned ({assigned.length})</div>
            <div>
              {assigned.map((eid) => {
                const e = data.employers.find((x) => x.id === eid);
                return e ? <span key={eid} className="assign-chip">{e.name}</span> : null;
              })}
            </div>
          </div>
        ) : null;

        const mcards = !matches.length ? (
          <div className="text-center py-6 text-text-2 text-xs">No employer matches for this profile.</div>
        ) : (
          matches.map(({ e, score }) => {
            const iA = assigned.includes(e.id);
            const sl = score >= 3 ? 'Strong' : score === 2 ? 'Good' : 'Partial';
            const sc = score >= 3 ? 'pill-good' : score === 2 ? 'pill-warn' : 'pill-bad';
            const pitch = localState.pitches[e.pitchType];
            const prev = pitch ? renderPitch(pitch.template, e, e.roles[0]).split('\n').slice(0, 3).join('\n') + '…' : '';
            return (
              <div key={e.id} className={`border rounded-md px-3.5 py-3 ${iA ? 'border-green-border bg-green-bg' : 'border-border'}`}>
                <div className="flex justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{e.name}</div>
                    <div className="text-[11px] text-text-2 mt-0.5">{e.corridor} · {e.sector} · {e.salary}</div>
                    <div className="flex flex-wrap mt-1.5">
                      {e.roles.slice(0, 3).map((r) => <span key={r} className="chip">{r}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`pill ${sc}`}>{sl} match</span>
                    {iA ? (
                      <span className="text-[10px] text-green font-medium">✓ Assigned</span>
                    ) : (
                      <span className="text-[10px] text-text-3">From Sheets</span>
                    )}
                  </div>
                </div>
                {pitch && prev && (
                  <div className="mt-2.5">
                    <div className="text-[10px] font-semibold text-text-2 mb-1.5">{pitch.icon} {pitch.label}</div>
                    <div className="pitch-box">{prev}</div>
                  </div>
                )}
              </div>
            );
          })
        );

        right = (
          <div>
            <div className="text-sm font-semibold mb-0.5">{p.label}</div>
            <div className="text-[11px] text-text-2 mb-3">
              {p.corridor === 'any' ? 'Both corridors' : p.corridor} · {p.tags.join(', ')}
            </div>
            {achips}
            <div className="text-[11px] font-medium text-text-2 mb-2.5">
              Suggested matches ({matches.length}) · Assignments managed in Google Sheets
            </div>
            <div className="flex flex-col gap-2">{mcards}</div>
          </div>
        );
      }
    }

    return (
      <div className="grid grid-cols-[240px_1fr] gap-3.5 items-start">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-text-3 mb-2">
            Skill profiles ({data.profiles.length})
          </div>
          <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto">{pList}</div>
        </div>
        <div className="card mb-0 min-h-[220px]">{right}</div>
      </div>
    );
  };

  const employerRegistry = () => {
    const filtered = data.employers.filter((e) => {
      const q = empFilter.search.toLowerCase();
      return (
        (!q || e.name.toLowerCase().includes(q) || e.subsector.toLowerCase().includes(q)) &&
        (empFilter.sector === 'all' || e.sector === empFilter.sector) &&
        (empFilter.corridor === 'all' || e.corridor === empFilter.corridor)
      );
    });

    if (!data.employers.length) {
      return <div className="card"><div className="text-center py-12 text-text-2">No employers loaded. Click Refresh.</div></div>;
    }

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="card-title mb-0">Employer registry ({filtered.length} of {data.employers.length})</div>
        </div>
        <div className="flex gap-2 mb-3.5 flex-wrap">
          <input
            className="input flex-1 min-w-[160px]"
            placeholder="Search name, role, subsector…"
            value={empFilter.search}
            onChange={(e) => setEmpFilter((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="input w-auto"
            value={empFilter.sector}
            onChange={(e) => setEmpFilter((prev) => ({ ...prev, sector: e.target.value }))}
          >
            <option value="all">All sectors</option>
            <option value="Service">Service</option>
            <option value="Manufacturing">Manufacturing</option>
          </select>
          <select
            className="input w-auto"
            value={empFilter.corridor}
            onChange={(e) => setEmpFilter((prev) => ({ ...prev, corridor: e.target.value }))}
          >
            <option value="all">Both corridors</option>
            <option value="Delhi NCR">Delhi NCR</option>
            <option value="Bengaluru">Bengaluru</option>
          </select>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
          {filtered.map((e: Employer) => {
            const isOpen = openEmps[e.id];
            const topColor = e.sector === 'Service' ? '#3266AD' : '#0F6E56';
            return (
              <div key={e.id} className="border border-border rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${topColor}` }}>
                <div className="px-3.5 py-3 cursor-pointer" onClick={() => toggleEmp(e.id)}>
                  <div className="text-[13px] font-semibold mb-1.5">{e.name}</div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className={`badge ${e.sector === 'Service' ? 'badge-sent' : ''}`}
                      style={e.sector === 'Manufacturing' ? { background: '#E1F5EE', color: '#0F6E56' } : undefined}>
                      {e.sector}
                    </span>
                    <span className="badge" style={e.corridor === 'Delhi NCR'
                      ? { background: '#FAEEDA', color: '#854F0B' }
                      : { background: '#FBEAF0', color: '#993556' }}>
                      {e.corridor}
                    </span>
                    <span className="text-[11px] text-text-2">{e.salary}</span>
                    <span className="ml-auto text-xs text-text-3">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 border-t border-border">
                    {[
                      ['Roles', e.roles.map((r) => <span key={r} className="chip">{r}</span>)],
                      ['Skill tags', e.skills.map((s) => <span key={s} className="chip">{s}</span>)],
                      ['Min. qual', e.minQual],
                      ['Vacancies', `${e.vacancies}/month · ${'⭐'.repeat(Math.min(5, e.femaleRating || 0))}`],
                      ['Contact', `${e.contact}${e.phone ? ' · ' + e.phone : ''}`],
                      ['Notes', e.notes],
                    ].map(([key, val]) => (
                      <div key={String(key)} className="flex gap-2 mt-2 text-[11px]">
                        <span className="text-text-2 min-w-[76px] flex-shrink-0">{key}</span>
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="card mb-3 py-3.5 px-[18px]">
        <div className="card-title mb-2">Employer matching</div>
        {subBtns}
      </div>
      {matchSubTab === 'match' && matchPanel()}
      {matchSubTab === 'employers' && employerRegistry()}
    </>
  );
}
