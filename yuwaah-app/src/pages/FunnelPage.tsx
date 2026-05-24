import type { DataState, FunnelMode } from '../types';
import { STAGE_DEFS, CONV_ORDER, SHEET_ID } from '../constants';
import { getFunnelPlanned, calcConv } from '../utils';
import { FunnelVizH } from '../components/FunnelVizH';
import type { FunnelBand, ConvRate } from '../components/FunnelVizH';

interface FunnelPageProps {
  data: DataState;
  view: string;
  funnelMode: FunnelMode;
  setFunnelMode: (m: FunnelMode) => void;
  gsStatus: string;
}

export function FunnelPage({ data, view, funnelMode, setFunnelMode, gsStatus }: FunnelPageProps) {
  const getActuals = () => {
    if (view === 'all') {
      const c: Record<string, number | string | null> = { last_updated: null };
      STAGE_DEFS.forEach((s) => { c[s.key] = null; });
      ['rj', 'od', 'jh'].forEach((st) => {
        const a = data.actuals[st as 'rj' | 'od' | 'jh'] || {};
        STAGE_DEFS.forEach((s) => {
          const v = a[s.key];
          if (v != null) c[s.key] = ((c[s.key] as number) || 0) + Number(v);
        });
        if (a.last_updated && (!c.last_updated || String(a.last_updated) > String(c.last_updated))) {
          c.last_updated = a.last_updated;
        }
      });
      return c;
    }
    return data.actuals[view as 'rj' | 'od' | 'jh'] || {};
  };

  const getUniverse = () => {
    const sources =
      view === 'all'
        ? [...data.sources.rj, ...data.sources.od, ...data.sources.jh]
        : data.sources[view as 'rj' | 'od' | 'jh'] || [];
    return sources.reduce((a, s) => a + Number((s as Record<string, string>)['vol'] || 0), 0);
  };

  const getTarget = () => {
    if (view === 'all') return Object.values(data.targets).reduce((a, v) => a + v, 0);
    return data.targets[view as 'rj' | 'od' | 'jh'] || 0;
  };

  const act = getActuals();
  const universe = getUniverse();
  const target = getTarget();
  const fp = getFunnelPlanned(universe, data.conv);
  const am = act['migrated'] as number | null;
  const al = act['leads'] as number | null;
  const oac = al && am ? ((am / al) * 100).toFixed(1) : null;

  // Build funnel bands based on mode + state view
  const funnelBands: FunnelBand[] = (() => {
    if (funnelMode === 'planning') {
      return [{ id: 'planned', label: 'Planned', color: '#E8601C', stages: fp }];
    }
    if (view === 'all') {
      return (
        [
          { id: 'rj', label: 'Rajasthan', color: '#1ED9BC' },
          { id: 'od', label: 'Odisha', color: '#4A9AE8' },
          { id: 'jh', label: 'Jharkhand', color: '#8B6AEA' },
        ] as const
      )
        .map((bd) => ({
          ...bd,
          stages: STAGE_DEFS.map((s) => {
            const v = data.actuals[bd.id as 'rj' | 'od' | 'jh']?.[s.key];
            return v != null ? Number(v) : null;
          }),
        }))
        .filter((b) => b.stages.some((v) => v != null));
    }
    const sa = data.actuals[view as 'rj' | 'od' | 'jh'] || {};
    const colorMap: Record<string, string> = { rj: '#1ED9BC', od: '#4A9AE8', jh: '#8B6AEA' };
    const labelMap: Record<string, string> = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
    return [
      {
        id: view,
        label: labelMap[view] || view,
        color: colorMap[view] || '#4A9AE8',
        stages: STAGE_DEFS.map((s) => {
          const v = sa[s.key];
          return v != null ? Number(v) : null;
        }),
      },
    ];
  })();

  // Conversion rates for funnel labels
  const funnelConvRates: ConvRate[] = CONV_ORDER.map((key, i) => ({
    actual:
      funnelMode === 'actuals'
        ? calcConv(act as Record<string, number | null>, STAGE_DEFS[i].key, STAGE_DEFS[i + 1].key)
        : null,
    planned: data.conv[key] ?? null,
  }));

  const modeToggle = (
    <div className="flex gap-2 items-center mb-4 flex-wrap">
      <div className="flex bg-bg-2 border border-border rounded-md p-0.5 gap-0.5">
        {(['planning', 'actuals'] as FunnelMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setFunnelMode(m)}
            className={`px-3.5 py-1.5 rounded-sm text-xs cursor-pointer border-none font-sans transition-all duration-150 ${
              funnelMode === m
                ? 'bg-bg-3 text-text font-medium'
                : 'bg-transparent text-text-2'
            }`}
          >
            {m === 'planning' ? '📊 Planning' : '📋 Actuals'}
          </button>
        ))}
      </div>
      {act.last_updated && (
        <span className="text-[11px] text-text-3 ml-auto">
          Sheet updated: {String(act.last_updated)}
        </span>
      )}
    </div>
  );

  if (funnelMode === 'planning') {
    return (
      <div className="card">
        <div className="card-title">Pipeline funnel — planning view</div>
        {modeToggle}
        <div className="bg-amber-bg border-l-4 border-nudge-border px-3 py-2 rounded-r text-[11px] text-amber-custom mb-4">
          Planning view — projections based on planned conversion ratios. Switch to Actuals to see live performance.
        </div>
        <FunnelVizH
          stageDefs={STAGE_DEFS}
          bands={funnelBands}
          convRates={funnelConvRates}
          mode="planning"
        />
      </div>
    );
  }

  // Actuals mode
  const bClass =
    am != null
      ? am / target >= 0.9
        ? 'bg-green-bg border border-green-border'
        : am / target >= 0.7
        ? 'bg-amber-bg border border-nudge-border'
        : 'bg-red-bg border border-[#A03030]'
      : 'bg-amber-bg border border-nudge-border';

  const stateRows = (['rj', 'od', 'jh'] as const).map((st) => {
    const a = data.actuals[st] || {};
    const labels = { rj: 'Rajasthan', od: 'Odisha', jh: 'Jharkhand' };
    const leads = a.leads != null ? Number(a.leads).toLocaleString() : '—';
    const migrated = a.migrated != null ? Number(a.migrated).toLocaleString() : '—';
    const conv =
      a.leads && a.migrated
        ? ((Number(a.migrated) / Number(a.leads)) * 100).toFixed(1) + '%'
        : '—';
    const tgt = data.targets[st] || 0;
    const pct = a.migrated != null ? Math.round((Number(a.migrated) / tgt) * 100) + '%' : '—';
    const gap = a.migrated != null ? tgt - Number(a.migrated) : null;
    const pc =
      a.migrated != null
        ? Number(a.migrated) >= tgt
          ? 'pill-good'
          : Number(a.migrated) >= tgt * 0.8
          ? 'pill-warn'
          : 'pill-bad'
        : 'pill-na';
    return (
      <tr key={st}>
        <td className="font-medium">{labels[st]}</td>
        <td className="text-right">{leads}</td>
        <td className="text-right">{migrated}</td>
        <td className="text-right">{tgt}</td>
        <td className="text-right">
          <span className={`pill ${pc}`}>{pct}</span>
        </td>
        <td className="text-right text-text-2 text-[11px]">
          {gap != null ? (gap <= 0 ? '✓ on track' : `−${gap} short`) : '—'}
        </td>
        <td className="text-right">{conv}</td>
        <td className="text-text-3 text-[10px]">{String(a.last_updated || '—')}</td>
      </tr>
    );
  });

  return (
    <div className="card">
      <div className="card-title">Pipeline funnel — actuals view</div>
      {modeToggle}

      {/* Summary metrics bar */}
      <div className={`rounded-lg p-4 px-5 flex gap-6 flex-wrap items-center mb-4 ${bClass}`}>
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            {am != null ? Number(am).toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-text-2 mt-0.5">Actual migrations</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">{target}</div>
          <div className="text-[11px] text-text-2 mt-0.5">Programme target</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            {am != null ? Math.round((am / target) * 100) + '%' : '—'}
          </div>
          <div className="text-[11px] text-text-2 mt-0.5">% of target</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">{oac ? oac + '%' : '—'}</div>
          <div className="text-[11px] text-text-2 mt-0.5">Lead → join conv.</div>
        </div>
        <div className="ml-auto text-[11px] text-text-2 italic">
          {gsStatus === 'live' ? '🟢 Live from Google Sheets' : 'Cached data'}
        </div>
      </div>

      {/* Performance legend */}
      <div className="flex gap-2 flex-wrap items-center mb-3 text-[11px] text-text-2">
        <span className="pill pill-good">On/above plan</span>
        <span className="pill pill-warn">Within 20% of plan</span>
        <span className="pill pill-bad">Below plan</span>
      </div>

      {/* Horizontal flowing funnel */}
      <FunnelVizH
        stageDefs={STAGE_DEFS}
        bands={funnelBands}
        convRates={funnelConvRates}
        mode="actuals"
      />

      {/* State-wise breakdown table */}
      <div className="mt-6">
        <div className="card-title">State-wise breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['State', 'Leads', 'Migrated', 'Target', '% Target', 'Gap', 'Conv.', 'Updated'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`text-left p-1.5 px-2.5 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase ${
                        i > 0 ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>{stateRows}</tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-text-2">
        To update: edit the <strong>Actuals</strong> sheet in{' '}
        <a
          href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
          target="_blank"
          rel="noreferrer"
          className="text-orange"
        >
          Google Sheets ↗
        </a>{' '}
        → click Refresh in the sidebar.
      </div>
    </div>
  );
}
