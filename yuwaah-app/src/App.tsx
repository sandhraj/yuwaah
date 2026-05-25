import { useEffect, useState, useCallback } from 'react';
import type { NavTab, StateView, FunnelMode, MatchSubTab, LocalState } from './types';
import { DEFAULT_STAGES, DEFAULT_FEARS, DEFAULT_PITCHES, SHEET_ID } from './constants';
import { useSheets } from './hooks/useSheets';
import { Sidebar } from './components/Sidebar';
import { MetricsGrid } from './components/MetricsGrid';
import { Toast } from './components/Toast';
import { FunnelPage } from './pages/FunnelPage';
import { SourcesPage } from './pages/SourcesPage';
import { ConversionsPage } from './pages/ConversionsPage';
import { FieldOpsPage } from './pages/FieldOpsPage';
import { MatchingPage } from './pages/MatchingPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { getFunnelPlanned } from './utils';
import './index.css';

function loadLocalState(): LocalState {
  try {
    const s = localStorage.getItem('yw_ls');
    if (s) {
      const p = JSON.parse(s);
      return {
        stages: p.stages || JSON.parse(JSON.stringify(DEFAULT_STAGES)),
        fears: p.fears || JSON.parse(JSON.stringify(DEFAULT_FEARS)),
        pitches: p.pitches || JSON.parse(JSON.stringify(DEFAULT_PITCHES)),
      };
    }
  } catch (_) {}
  return {
    stages: JSON.parse(JSON.stringify(DEFAULT_STAGES)),
    fears: JSON.parse(JSON.stringify(DEFAULT_FEARS)),
    pitches: JSON.parse(JSON.stringify(DEFAULT_PITCHES)),
  };
}

const PAGE_TITLES: Record<NavTab, string> = {
  funnel: 'Pipeline Funnel',
  sources: 'Source Channels',
  conversions: 'Conversion Ratios',
  fieldops: 'Field Ops & Roles',
  matching: 'Employer Matching',
  candidates: 'Candidate Tracker',
};

// Shorter labels for narrow screens
const STATE_TABS: { value: StateView; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'All States', shortLabel: 'All' },
  { value: 'rj', label: 'Rajasthan → Delhi NCR', shortLabel: 'Rajasthan' },
  { value: 'od', label: 'Odisha → Bengaluru', shortLabel: 'Odisha' },
  { value: 'jh', label: 'Jharkhand → Bengaluru', shortLabel: 'Jharkhand' },
];

export default function App() {
  const { data, status, lastRefresh, debugLog, fetchAllSheets } = useSheets();
  const [navTab, setNavTab] = useState<NavTab>('funnel');
  const [view, setView] = useState<StateView>('all');
  const [funnelMode, setFunnelMode] = useState<FunnelMode>('actuals');
  const [matchSubTab, setMatchSubTab] = useState<MatchSubTab>('match');
  const [showDebug, setShowDebug] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [localState, setLocalState] = useState<LocalState>(loadLocalState);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { fetchAllSheets(); }, [fetchAllSheets]);

  const showToast = useCallback(() => setToastVisible(true), []);

  const getSources = () =>
    view === 'all'
      ? [...data.sources.rj, ...data.sources.od, ...data.sources.jh]
      : data.sources[view] || [];

  const getUniverse = () => getSources().reduce((a, s) => a + Number((s as Record<string, string>)['vol'] || 0), 0);
  const getTarget = () =>
    view === 'all' ? Object.values(data.targets).reduce((a, v) => a + v, 0) : data.targets[view] || 0;

  const getActuals = () => {
    if (view === 'all') {
      const c: Record<string, number | null | string> = {};
      ['leads', 'outreach', 'responded', 'prequalified', 'counselled', 'parent_approved', 'docs_complete', 'interview', 'selected', 'offer_released', 'migrated'].forEach((k) => { c[k] = null; });
      ['rj', 'od', 'jh'].forEach((st) => {
        const a = data.actuals[st as 'rj' | 'od' | 'jh'] || {};
        Object.keys(c).forEach((k) => {
          const v = a[k];
          if (v != null) c[k] = ((c[k] as number) || 0) + Number(v);
        });
      });
      return c;
    }
    return data.actuals[view] || {};
  };

  const act = getActuals();
  const universe = getUniverse();
  const target = getTarget();
  const fp = getFunnelPlanned(universe, data.conv);
  const am = act['migrated'] as number | null;
  const al = act['leads'] as number | null;
  const oac = al && am ? ((am / al) * 100).toFixed(1) : null;
  const totalAssigned = Object.values(data.assignments).reduce((a, v) => a + v.length, 0);

  const metrics = [
    { label: 'Lead universe', value: universe.toLocaleString(), sub: `${getSources().length} channels` },
    {
      label: 'Projected joins',
      value: fp[fp.length - 1].toLocaleString(),
      sub: `planned, target ${target}`,
      color: fp[fp.length - 1] >= target ? '#0F6E56' : '#E8601C',
    },
    {
      label: 'Actual leads',
      value: al != null ? Number(al).toLocaleString() : '—',
      sub: 'from tracker',
      color: al ? undefined : '#4D6A88',
    },
    {
      label: 'Actual migrations',
      value: am != null ? Number(am).toLocaleString() : '—',
      sub: am != null ? `of ${target} · ${Math.round(am / target * 100)}%` : 'no data yet',
      color: am != null ? (am >= target ? '#0F6E56' : '#E8601C') : '#9B9B98',
    },
    {
      label: 'Lead → join rate',
      value: oac ? oac + '%' : '—',
      sub: 'end-to-end actual',
    },
    {
      label: 'Employer matches',
      value: String(totalAssigned),
      sub: `${data.profiles.length} profiles`,
    },
  ];

  return (
    // On mobile: single-column block layout (sidebar overlays via fixed position)
    // On md+: 2-column grid with sticky sidebar
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">

      {/* Mobile backdrop — tap to close sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        navTab={navTab}
        setNavTab={setNavTab}
        status={status}
        lastRefresh={lastRefresh}
        onRefresh={fetchAllSheets}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="p-4 px-4 md:p-5 md:px-6 max-w-none overflow-x-hidden">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden btn btn-sm px-2 flex-shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <span className="text-base leading-none">☰</span>
            </button>
            <div className="min-w-0">
              <div className="text-[20px] md:text-[22px] font-semibold text-text tracking-tight leading-tight">
                {PAGE_TITLES[navTab]}
              </div>
              <div className="text-[11px] text-text-2 mt-0.5 hidden sm:block">
                YuWaah Migration Support Program · Sambhav Foundation
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <button className="btn btn-sm hidden md:inline-flex" onClick={() => setShowDebug((v) => !v)}>
              🔍 Debug
            </button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm"
            >
              📊<span className="hidden sm:inline"> Open Sheet</span> ↗
            </a>
          </div>
        </div>

        {showDebug && (
          <div className="debug-panel mb-3">{debugLog.join('\n') || 'No debug info yet.'}</div>
        )}

        {/* State filter tabs — short labels on mobile, full on sm+ */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {STATE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer font-sans transition-all duration-150 ${
                view === t.value
                  ? 'bg-orange text-white border-orange font-medium'
                  : 'bg-bg-3 border-border text-text-2 hover:border-orange hover:text-orange'
              }`}
            >
              <span className="sm:hidden">{t.shortLabel}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <MetricsGrid metrics={metrics} />

        {navTab === 'funnel' && (
          <FunnelPage
            data={data}
            view={view}
            funnelMode={funnelMode}
            setFunnelMode={setFunnelMode}
            gsStatus={status}
          />
        )}
        {navTab === 'sources' && <SourcesPage data={data} view={view} />}
        {navTab === 'conversions' && <ConversionsPage data={data} view={view} />}
        {navTab === 'fieldops' && (
          <FieldOpsPage
            localState={localState}
            setLocalState={setLocalState}
            showToast={showToast}
          />
        )}
        {navTab === 'matching' && (
          <MatchingPage
            data={data}
            localState={localState}
            matchSubTab={matchSubTab}
            setMatchSubTab={setMatchSubTab}
          />
        )}
        {navTab === 'candidates' && <CandidatesPage data={data} />}
      </main>

      <Toast visible={toastVisible} onHide={() => setToastVisible(false)} />
    </div>
  );
}
