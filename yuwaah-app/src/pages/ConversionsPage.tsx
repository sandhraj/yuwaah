import type { DataState } from '../types';
import { STAGE_DEFS, CONV_ORDER, CONV_LABELS, SHEET_ID } from '../constants';
import { getFunnelPlanned, calcConv, convClass } from '../utils';

interface ConversionsPageProps {
  data: DataState;
  view: string;
}

export function ConversionsPage({ data, view }: ConversionsPageProps) {
  const getActuals = () => {
    if (view === 'all') {
      const c: Record<string, number | null> = {};
      STAGE_DEFS.forEach((s) => { c[s.key] = null; });
      ['rj', 'od', 'jh'].forEach((st) => {
        const a = data.actuals[st as 'rj' | 'od' | 'jh'] || {};
        STAGE_DEFS.forEach((s) => {
          const v = a[s.key];
          if (v != null) c[s.key] = (c[s.key] || 0) + Number(v);
        });
      });
      return c;
    }
    const raw = data.actuals[view as 'rj' | 'od' | 'jh'] || {};
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v as number | null]));
  };

  const act = getActuals();
  const sources = view === 'all'
    ? [...data.sources.rj, ...data.sources.od, ...data.sources.jh]
    : data.sources[view as 'rj' | 'od' | 'jh'] || [];
  const universe = sources.reduce((a, s) => a + Number((s as Record<string, string>)['vol'] || 0), 0);
  const fp = getFunnelPlanned(universe, data.conv);

  return (
    <>
      <div className="card">
        <div className="card-title">Planned conversion ratios</div>
        <div className="text-[11px] text-text-2 mb-3.5">
          Loaded from Conv_Ratios sheet. Edit in{' '}
          <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noreferrer" className="text-orange">
            Google Sheets ↗
          </a>{' '}
          then refresh.
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
          {CONV_ORDER.map((id) => (
            <div key={id} className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-text-2">
                <span>{CONV_LABELS[id]}</span>
                <span className="text-xs font-semibold text-orange">{data.conv[id] || 0}%</span>
              </div>
              <input type="range" min="5" max="100" value={data.conv[id] || 0} disabled />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Planned vs actual — side by side</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Stage', 'Planned vol.', 'Planned %', 'Actual %', 'Variance'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left p-1.5 px-2.5 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase ${i > 0 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAGE_DEFS.map((s, i) => {
                const acp = i > 0 ? calcConv(act, STAGE_DEFS[i - 1].key, s.key) : null;
                const pcp = i > 0 ? data.conv[CONV_ORDER[i - 1]] : null;
                const cc = acp != null ? convClass(acp, pcp || 0) : 'pill-na';
                const v = acp != null && pcp != null ? acp - pcp : null;
                return (
                  <tr key={s.key}>
                    <td className="p-1.5 px-2.5 border-b border-border">{s.label}</td>
                    <td className="p-1.5 px-2.5 border-b border-border text-right font-medium">{fp[i].toLocaleString()}</td>
                    <td className="p-1.5 px-2.5 border-b border-border text-right">{pcp != null ? pcp + '%' : '—'}</td>
                    <td className="p-1.5 px-2.5 border-b border-border text-right">
                      {acp != null ? <span className={`pill ${cc}`}>{acp}%</span> : <span className="text-text-3">—</span>}
                    </td>
                    <td className="p-1.5 px-2.5 border-b border-border text-right">
                      {v != null ? (
                        <span className={`pill ${v >= 0 ? 'pill-pos' : v >= -10 ? 'pill-zero' : 'pill-neg'}`}>
                          {v >= 0 ? '+' : ''}{v}pp
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
