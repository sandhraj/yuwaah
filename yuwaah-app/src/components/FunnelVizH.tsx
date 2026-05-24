export interface FunnelBand {
  id: string;
  label: string;
  color: string;
  stages: (number | null)[];
}

export interface ConvRate {
  actual: number | null;
  planned: number | null;
}

interface FunnelVizHProps {
  stageDefs: { key: string; label: string }[];
  bands: FunnelBand[];
  convRates: ConvRate[];
  mode: 'planning' | 'actuals';
}

// SVG coordinate constants
const VBW = 960;
const VBH = 286;
const L = 30;
const R = 30;
const BTOP = 30;
const BBOT = 218;
const BCTR = (BTOP + BBOT) / 2;
const MAXH = (BBOT - BTOP) * 0.90;
const CNT_Y = 238;
const NM_Y = 256;
const CONV_Y_EVEN = 14;
const CONV_Y_ODD = 23;

// Abbreviated stage labels to fit in column width
const SHORT: Record<string, string> = {
  'Nudgebay outreach': 'Outreach',
  'Pre-qualified': 'Pre-qual.',
  'Parent approved': 'Parent appr.',
  'Docs complete': 'Docs',
  'Interview scheduled': 'Interview',
  'Employer selected': 'Selected',
  'Offer released': 'Offer',
  'Migrated & joined': 'Migrated',
};

function stageX(i: number, n: number): number {
  return L + (i / (n - 1)) * (VBW - L - R);
}

function barH(total: number, maxTot: number): number {
  if (maxTot <= 0) return MAXH * 0.04;
  return Math.max(Math.sqrt(total / maxTot) * MAXH, MAXH * 0.04);
}

function buildBounds(bands: FunnelBand[], maxTot: number): number[][] {
  const n = bands[0].stages.length;
  return Array.from({ length: n }, (_, i) => {
    const tot = bands.reduce((s, b) => s + (b.stages[i] ?? 0), 0);
    const h = barH(tot, maxTot);
    const ty = BCTR - h / 2;
    let cum = 0;
    const res = [ty];
    for (const b of bands) {
      const bH = tot > 0 ? ((b.stages[i] ?? 0) / tot) * h : h / bands.length;
      cum += bH;
      res.push(ty + cum);
    }
    return res;
  });
}

function makePath(bds: number[][], xs: number[], k: number): string {
  const n = xs.length;
  const top = bds.map(b => b[k]);
  const bot = bds.map(b => b[k + 1]);
  let d = `M ${xs[0]} ${top[0]}`;
  for (let i = 1; i < n; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${mx} ${top[i - 1]} ${mx} ${top[i]} ${xs[i]} ${top[i]}`;
  }
  d += ` L ${xs[n - 1]} ${bot[n - 1]}`;
  for (let i = n - 2; i >= 0; i--) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    d += ` C ${mx} ${bot[i + 1]} ${mx} ${bot[i]} ${xs[i]} ${bot[i]}`;
  }
  return d + ' Z';
}

function convColor(cr: ConvRate, mode: string): string {
  if (mode === 'planning' || cr.actual == null) return '#3D5678';
  if (cr.planned == null) return '#7B96B8';
  if (cr.actual >= cr.planned) return '#3ECBA8';
  if (cr.actual >= cr.planned * 0.8) return '#F5B942';
  return '#F07070';
}

export function FunnelVizH({ stageDefs, bands, convRates, mode }: FunnelVizHProps) {
  const n = stageDefs.length;
  const hasData = bands.some(b => b.stages.some(v => v != null && v > 0));

  if (!hasData && mode === 'actuals') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 12, color: '#4D6A88' }}>
        No actuals data yet — refresh from Google Sheets
      </div>
    );
  }

  const xs = stageDefs.map((_, i) => stageX(i, n));
  const maxTot = Math.max(
    ...stageDefs.map((_, i) => bands.reduce((s, b) => s + (b.stages[i] ?? 0), 0)),
  );
  const bds = buildBounds(bands, maxTot);
  const totals = stageDefs.map((_, i) => bands.reduce((s, b) => s + (b.stages[i] ?? 0), 0));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        style={{ minWidth: 680, width: '100%', display: 'block' }}
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        <defs>
          {bands.map(b => (
            <linearGradient key={b.id} id={`fvh-${b.id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={b.color} stopOpacity="0.95" />
              <stop offset="70%" stopColor={b.color} stopOpacity="0.78" />
              <stop offset="100%" stopColor={b.color} stopOpacity="0.60" />
            </linearGradient>
          ))}
        </defs>

        {/* Flowing band paths */}
        {bands.map((b, k) => (
          <path key={b.id} d={makePath(bds, xs, k)} fill={`url(#fvh-${b.id})`} />
        ))}

        {/* Stage divider marks */}
        {xs.map((x, i) => {
          const ty = bds[i][0] - 3;
          const by = bds[i][bands.length] + 3;
          return (
            <line
              key={i}
              x1={x} y1={ty}
              x2={x} y2={by}
              stroke="#0F1E36"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Conversion rate labels — staggered above bands */}
        {convRates.map((cr, i) => {
          const midX = (xs[i] + xs[i + 1]) / 2;
          const rate = mode === 'actuals' && cr.actual != null ? cr.actual : cr.planned;
          if (rate == null) return null;
          const ly = i % 2 === 0 ? CONV_Y_EVEN : CONV_Y_ODD;
          return (
            <text
              key={i}
              x={midX}
              y={ly}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill={convColor(cr, mode)}
            >
              {rate}%
            </text>
          );
        })}

        {/* Stage totals */}
        {stageDefs.map((s, i) => (
          <text
            key={s.key + '_c'}
            x={xs[i]}
            y={CNT_Y}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#C8DAEA"
          >
            {totals[i] > 0 ? totals[i].toLocaleString() : '—'}
          </text>
        ))}

        {/* Stage names */}
        {stageDefs.map((s, i) => (
          <text
            key={s.key + '_n'}
            x={xs[i]}
            y={NM_Y}
            textAnchor="middle"
            fontSize="7.5"
            fill="#3D5678"
          >
            {SHORT[s.label] ?? s.label}
          </text>
        ))}
      </svg>

      {/* State legend */}
      {bands.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          {bands.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                style={{
                  width: 24,
                  height: 8,
                  borderRadius: 3,
                  background: b.color,
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: 10, color: '#7B96B8' }}>{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
