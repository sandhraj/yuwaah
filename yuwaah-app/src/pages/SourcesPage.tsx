import { useState } from 'react';
import type { DataState, Source } from '../types';
import { CHANNEL_COLORS, SHEET_ID } from '../constants';
import { badgeClass } from '../utils';

interface SourcesPageProps {
  data: DataState;
  view: string;
}

export function SourcesPage({ data, view }: SourcesPageProps) {
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  const getSources = (): (Source & { _st: string })[] => {
    if (view === 'all') {
      return [
        ...data.sources.rj.map((s) => ({ ...s, _st: 'RJ' })),
        ...data.sources.od.map((s) => ({ ...s, _st: 'OD' })),
        ...data.sources.jh.map((s) => ({ ...s, _st: 'JH' })),
      ] as (Source & { _st: string })[];
    }
    return (data.sources[view as 'rj' | 'od' | 'jh'] || []).map((s) => ({ ...s, _st: view.toUpperCase() })) as (Source & { _st: string })[];
  };

  const sources = getSources();
  const universe = sources.reduce((a, s) => a + Number(s.vol || 0), 0);

  const toggleCard = (k: string) => setOpenCards((prev) => ({ ...prev, [k]: !prev[k] }));

  if (!sources.length) {
    return (
      <div className="card">
        <div className="text-center py-12 text-text-2">No sources loaded. Click Refresh.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="card-title mb-0">
          Source channels ({sources.length} · {universe.toLocaleString()} leads)
        </div>
        <a
          href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-orange"
        >
          Edit in Sheets ↗
        </a>
      </div>

      <div className="flex gap-3 flex-wrap mb-3.5">
        {Object.entries(CHANNEL_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-[11px] text-text-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
        {sources.map((s, i) => {
          const k = `${s._st}_${i}`;
          const color = CHANNEL_COLORS[s.type] || '#888';
          const isOpen = openCards[k];
          return (
            <div key={k} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 bg-bg-2 cursor-pointer"
                onClick={() => toggleCard(k)}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs font-medium flex-1">
                  {s.name}
                  {view === 'all' && (
                    <span className="text-[9px] bg-bg-3 px-1 py-0.5 rounded ml-1 text-text-2">{s._st}</span>
                  )}
                </span>
                <span className={`badge ${badgeClass(s.status)}`}>{s.status}</span>
                <span className="text-xs text-text-3 ml-1">▼</span>
              </div>
              {isOpen && (
                <div className="px-3.5 py-3 border-t border-border">
                  {[
                    ['Channel', `${s.type}${s.subSource ? ' › ' + s.subSource : ''}`],
                    ['Est. pool', `${Number(s.vol || 0).toLocaleString()} candidates`],
                    ['Contact', s.contact],
                    ['Districts', s.districts],
                    ['About', s.desc],
                    ['Next action', s.action],
                  ].map(([key, val]) => (
                    <div key={key} className="flex gap-2 mb-1.5">
                      <span className="text-[11px] text-text-2 min-w-[80px] flex-shrink-0">{key}</span>
                      <span
                        className="text-[11px] leading-snug"
                        style={key === 'Next action' ? { color: '#E8601C', fontWeight: 500 } : undefined}
                      >
                        {key === 'Est. pool' ? <strong>{val}</strong> : val}
                      </span>
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
}
