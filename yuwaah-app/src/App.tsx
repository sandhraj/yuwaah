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
};

export default function App() {
  const { data, status, lastRefresh, debugLog, fetchAllSheets } = useSheets();
  const [navTab, setNavTab] = useState<NavTab>('funnel');
  const [view, setView] = useState<StateView>('all');
  const [funnelMode, setFunnelMode] = useState<FunnelMode>('actuals');
  const [matchSubTab, setMatchSubTab] = useState<MatchSubTab>('match');
  const [showDebug, setShowDebug] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [localState, setLocalState] = useState<LocalState>(loadLocalState);

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
      color: al ? '#1A1A18' : '#9B9B98',
    },
    {
      label: 'Actual migrations',
      value: am != null ? Number(am).toLocaleString() : '—',
      sub: am != null ? `of ${target} · ${Math.round(am / target * 100)}%` : 'no data yet',
      color: am != null ? (am >= target ? '#0F6E56' : '#E8601C') : '#9B9B98',
    },
    {
      label: 'End-to-end conv.',
      value: oac ? oac + '%' : '—',
      sub: 'lead → join (actual)',
    },
    {
      label: 'Employer matches',
      value: String(totalAssigned),
      sub: `${data.profiles.length} profiles`,
    },
  ];

  const stateTabs: { value: StateView; label: string }[] = [
    { value: 'all', label: 'All States' },
    { value: 'rj', label: 'Rajasthan → Delhi NCR' },
    { value: 'od', label: 'Odisha → Bengaluru' },
    { value: 'jh', label: 'Jharkhand → Bengaluru' },
  ];

  return (
    <div className="grid grid-cols-[220px_1fr] min-h-screen">
      <Sidebar
        navTab={navTab}
        setNavTab={setNavTab}
        status={status}
        lastRefresh={lastRefresh}
        onRefresh={fetchAllSheets}
      />

      <main className="p-7 px-8 max-w-[1200px]">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-[22px] font-semibold text-text tracking-tight">{PAGE_TITLES[navTab]}</div>
            <div className="text-[13px] text-text-2 mt-1">YuWaah Migration Support Program · Sambhav Foundation</div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button className="btn btn-sm" onClick={() => setShowDebug((v) => !v)}>🔍 Debug</button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm"
            >
              📊 Open Sheet ↗
            </a>
          </div>
        </div>

        {showDebug && (
          <div className="debug-panel mb-3">{debugLog.join('\n') || 'No debug info yet.'}</div>
        )}

        <div className="flex gap-1.5 mb-6 flex-wrap">
          {stateTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={`px-4 py-1.5 rounded-full border text-xs cursor-pointer font-sans transition-all duration-150 ${
                view === t.value
                  ? 'bg-orange text-white border-orange font-medium'
                  : 'bg-white border-border-2 text-text-2 hover:border-orange hover:text-orange'
              }`}
            >
              {t.label}
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
      </main>

      <Toast visible={toastVisible} onHide={() => setToastVisible(false)} />
    </div>
  );
}
