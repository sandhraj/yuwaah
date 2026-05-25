import type { Actuals, Candidate, Employer, SkillProfile } from '../types';
import { STAGE_KEYS, CONV_ORDER, DEFAULT_CONV } from '../constants';

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else field += c;
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        row.push(field); field = '';
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else field += c;
    }
  }
  if (row.length || field) rows.push([...row, field]);
  return rows;
}

export function parseNum(v: unknown): number | null {
  if (v == null || v === '' || v === '-' || v === '—') return null;
  const n = Number(String(v).replace(/[,%\s]/g, '').trim());
  return isNaN(n) ? null : n;
}

export function parseActuals(rows: string[][], debugLog: string[]): { rj: Actuals; od: Actuals; jh: Actuals } {
  const dbg = rows.slice(0, 6).map((r, i) => `row${i}: col0="${r[0]}" col2="${r[2]}" col3="${r[3]}" col4="${r[4]}"`).join('\n');
  debugLog.push('ACTUALS header scan:\n' + dbg);
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'stage_key') { hi = i; break; }
  }
  debugLog.push('header row index: ' + hi);
  const rj: Actuals = {}, od: Actuals = {}, jh: Actuals = {};
  const scan = (startIdx: number, rjC: number, odC: number, jhC: number) => {
    for (let i = startIdx; i < rows.length; i++) {
      const key = rows[i][0]?.trim();
      if (!key || key.toLowerCase().startsWith('legend')) continue;
      if (key === 'last_updated') {
        rj.last_updated = rows[i][rjC]?.trim() || null;
        od.last_updated = rows[i][odC]?.trim() || null;
        jh.last_updated = rows[i][jhC]?.trim() || null;
        continue;
      }
      if (STAGE_KEYS.includes(key)) {
        rj[key] = parseNum(rows[i][rjC]);
        od[key] = parseNum(rows[i][odC]);
        jh[key] = parseNum(rows[i][jhC]);
        debugLog.push(`  ${key}: rj=${rj[key]} od=${od[key]} jh=${jh[key]}`);
      }
    }
  };
  if (hi === -1) {
    debugLog.push('Header not found — fallback: scanning all rows for stage keys');
    scan(0, 2, 3, 4);
  } else {
    const headers = rows[hi].map((h) => h.trim().toLowerCase());
    const rc = Math.max(headers.indexOf('rj_actual'), 2);
    const oc = Math.max(headers.indexOf('od_actual'), 3);
    const jc = Math.max(headers.indexOf('jh_actual'), 4);
    debugLog.push(`using cols rj=${rc} od=${oc} jh=${jc}`);
    scan(hi + 1, rc, oc, jc);
  }
  return { rj, od, jh };
}

export function parseConv(rows: string[][]): Record<string, number> {
  const conv = { ...DEFAULT_CONV };
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'conv_key') { hi = i; break; }
  }
  const si = hi > -1 ? hi + 1 : 0;
  for (let i = si; i < rows.length; i++) {
    const key = rows[i][0]?.trim();
    if (!key) continue;
    let pctCol = 3;
    if (hi > -1) {
      const h = rows[hi].map((x) => x.trim().toLowerCase());
      const pi = h.indexOf('planned_pct');
      if (pi > -1) pctCol = pi;
    }
    const pct = parseNum(rows[i][pctCol]);
    if (Object.prototype.hasOwnProperty.call(DEFAULT_CONV, key) && pct != null) conv[key] = pct;
  }
  return conv;
}

export function parseTargets(rows: string[][]): { rj: number; od: number; jh: number } {
  const tgt = { rj: 280, od: 200, jh: 120 };
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i][0]?.trim() as keyof typeof tgt;
    const val = parseNum(rows[i][2]);
    if (key && val != null && Object.prototype.hasOwnProperty.call(tgt, key)) tgt[key] = val;
  }
  return tgt;
}

export function parseSources(rows: string[][]): Record<string, string>[] {
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'id') { hi = i; break; }
  }
  if (hi === -1) return [];
  const headers = rows[hi].map((h) => h.trim());
  return rows.slice(hi + 1).filter((r) => r[0]?.trim()).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]?.trim() || ''; });
    return obj;
  }).filter((r) => r['id'] && r['name']);
}

export function parseEmployers(rows: string[][]): Employer[] {
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'id') { hi = i; break; }
  }
  if (hi === -1) return [];
  const headers = rows[hi].map((h) => h.trim());
  return rows.slice(hi + 1).filter((r) => r[0]?.trim()).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]?.trim() || ''; });
    return {
      ...obj,
      vacancies: parseNum(obj['vacancies']) || 0,
      femaleRating: parseNum(obj['femaleRating']) || 4,
      roles: (obj['roles'] || '').split(',').map((x) => x.trim()).filter(Boolean),
      skills: (obj['skills'] || '').split(',').map((x) => x.trim()).filter(Boolean),
    } as unknown as Employer;
  }).filter((r) => r.id && r.name);
}

export function parseProfiles(rows: string[][]): SkillProfile[] {
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'id') { hi = i; break; }
  }
  if (hi === -1) return [];
  const headers = rows[hi].map((h) => h.trim());
  return rows.slice(hi + 1).filter((r) => r[0]?.trim()).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]?.trim() || ''; });
    return { ...obj, tags: (obj['tags'] || '').split(',').map((x) => x.trim()).filter(Boolean) } as unknown as SkillProfile;
  }).filter((r) => r.id && r.label);
}

export function parseAssignments(rows: string[][]): Record<string, string[]> {
  const a: Record<string, string[]> = {};
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'profile_id') { hi = i; break; }
  }
  if (hi === -1) return a;
  rows.slice(hi + 1).filter((r) => r[0]?.trim() && r[2]?.trim()).forEach((r) => {
    const pid = r[0].trim(), eid = r[2].trim();
    if (!a[pid]) a[pid] = [];
    if (!a[pid].includes(eid)) a[pid].push(eid);
  });
  return a;
}

export function parseCandidates(rows: string[][]): Candidate[] {
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'candidate_id') { hi = i; break; }
  }
  if (hi === -1) return [];
  const headers = rows[hi].map((h) => h.trim().toLowerCase());
  const col = (name: string, fallback: number) => { const i = headers.indexOf(name); return i >= 0 ? i : fallback; };
  const idC = col('candidate_id', 0);
  const nameC = col('name', 1);
  const phoneC = col('phone', 2);
  const stateC = col('state', 3);
  const stageC = col('current_stage', 4);
  const employerC = col('employer', 6);
  const updatedC = col('last_updated', 7);
  const notesC = col('notes', 8);
  const stageOrderMap: Record<string, number> = {};
  STAGE_KEYS.forEach((k, i) => { stageOrderMap[k] = i + 1; });
  return rows.slice(hi + 1)
    .filter((r) => r[nameC]?.trim())
    .map((r, i) => {
      const stage = r[stageC]?.trim().toLowerCase() || '';
      return {
        id: r[idC]?.trim() || String(i + 1),
        name: r[nameC]?.trim() || '',
        phone: r[phoneC]?.trim() || '',
        state: r[stateC]?.trim().toLowerCase() || '',
        stage,
        stageOrder: stageOrderMap[stage] ?? 0,
        employer: r[employerC]?.trim() || '',
        lastUpdated: r[updatedC]?.trim() || '',
        notes: r[notesC]?.trim() || '',
      };
    });
}

export function getFunnelPlanned(universe: number, conv: Record<string, number>): number[] {
  const st = [universe];
  CONV_ORDER.forEach((k) => st.push(Math.round(st[st.length - 1] * (conv[k] || 0) / 100)));
  return st;
}

export function calcConv(actuals: Actuals, fromKey: string, toKey: string): number | null {
  const f = actuals[fromKey] as number | null;
  const t = actuals[toKey] as number | null;
  if (f == null || t == null || f === 0) return null;
  return Math.round((t / f) * 100);
}

export function convClass(actual: number | null, planned: number): string {
  if (actual == null) return 'pill-na';
  if (actual >= planned) return 'pill-good';
  if (actual >= planned * 0.8) return 'pill-warn';
  return 'pill-bad';
}

export function badgeClass(status: string): string {
  if (status === 'Active') return 'badge-active';
  if (status === 'Proposal sent') return 'badge-sent';
  return 'badge-pending';
}

export function scoreMatch(profile: SkillProfile, employer: Employer): number {
  if (profile.corridor !== 'any' && profile.corridor !== employer.corridor) return 0;
  let hits = 0;
  profile.tags.forEach((t) => {
    if (employer.skills.some((s) => s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase()))) hits++;
  });
  return hits;
}

export function renderPitch(template: string, employer: Employer, role: string): string {
  if (!template) return '';
  return template
    .replace(/{candidate_name}/g, '[Candidate]')
    .replace(/{employer_name}/g, employer.name)
    .replace(/{city}/g, employer.corridor)
    .replace(/{role}/g, role || employer.roles[0] || '')
    .replace(/{salary}/g, employer.salary)
    .replace(/{min_qual}/g, employer.minQual);
}
