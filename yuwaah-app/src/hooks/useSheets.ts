import { useState, useCallback } from 'react';
import type { DataState, GSStatus, Actuals } from '../types';
import { SHEET_URLS, STAGE_DEFS } from '../constants';
import {
  parseCSV, parseActuals, parseConv, parseTargets,
  parseSources, parseEmployers, parseProfiles, parseAssignments, parseCandidates,
} from '../utils';

const initialData: DataState = {
  actuals: { rj: {}, od: {}, jh: {} },
  conv: {},
  targets: { rj: 280, od: 200, jh: 120 },
  sources: { rj: [], od: [], jh: [] },
  employers: [],
  profiles: [],
  assignments: {},
  candidates: [],
};

export function useSheets() {
  const [data, setData] = useState<DataState>(initialData);
  const [status, setStatus] = useState<GSStatus>('loading');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const fetchSheet = async (name: string): Promise<string[][]> => {
    const url = SHEET_URLS[name];
    if (!url) throw new Error(`No URL configured for sheet "${name}"`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} for "${name}"`);
    const text = await r.text();
    if (text.trimStart().startsWith('<')) throw new Error(`Sheet "${name}" returned HTML — tab may not be published`);
    return parseCSV(text);
  };

  const fetchAllSheets = useCallback(async () => {
    setStatus('loading');
    const log: string[] = [];
    try {
      log.push('Fetching sheets…');
      const [actR, convR, tgtR, srcRJ, srcOD, srcJH, empR, profR, asgnR] = await Promise.all([
        fetchSheet('Actuals'), fetchSheet('Conv_Ratios'), fetchSheet('Targets'),
        fetchSheet('Sources_RJ'), fetchSheet('Sources_OD'), fetchSheet('Sources_JH'),
        fetchSheet('Employers'), fetchSheet('Skill_Profiles'), fetchSheet('Assignments'),
      ]);
      const actuals = parseActuals(actR, log);
      const conv = parseConv(convR);
      const targets = parseTargets(tgtR);
      const sourcesRJ = parseSources(srcRJ);
      const sourcesOD = parseSources(srcOD);
      const sourcesJH = parseSources(srcJH);
      const employers = parseEmployers(empR);
      const profiles = parseProfiles(profR);
      const assignments = parseAssignments(asgnR);
      // Candidate tabs are optional — each fetched independently, skipped if GID not yet set
      let candidates = initialData.candidates;
      const mergedActuals = { ...actuals };
      try {
        const [odR, rjR, jhR] = await Promise.allSettled([
          fetchSheet('Candidates_OD'),
          fetchSheet('Candidates_RJ'),
          fetchSheet('Candidates_JH'),
        ]);
        // Keep per-tab arrays — derive actuals directly without state-field matching
        const odC = odR.status === 'fulfilled' ? parseCandidates(odR.value, 'od') : [];
        const rjC = rjR.status === 'fulfilled' ? parseCandidates(rjR.value, 'rj') : [];
        const jhC = jhR.status === 'fulfilled' ? parseCandidates(jhR.value, 'jh') : [];
        candidates = [...odC, ...rjC, ...jhC];
        log.push(`Candidates OD=${odC.length} RJ=${rjC.length} JH=${jhC.length}`);
        if (odR.status === 'rejected') log.push(`Candidates OD FAIL: ${odR.reason instanceof Error ? odR.reason.message : odR.reason}`);
        if (rjR.status === 'rejected') log.push(`Candidates RJ FAIL: ${rjR.reason instanceof Error ? rjR.reason.message : rjR.reason}`);
        if (jhR.status === 'rejected') log.push(`Candidates JH FAIL: ${jhR.reason instanceof Error ? jhR.reason.message : jhR.reason}`);
        // Override actuals per state directly from tab arrays (no state-field matching)
        ([['od', odC], ['rj', rjC], ['jh', jhC]] as const).forEach(([st, sc]) => {
          if (sc.length === 0) return;
          const stActuals: Actuals = { last_updated: actuals[st]?.last_updated ?? null };
          STAGE_DEFS.forEach((stageDef, i) => {
            stActuals[stageDef.key] = sc.filter((c) => c.stageOrder >= i + 1).length;
          });
          mergedActuals[st] = stActuals;
          log.push(`Derived ${st.toUpperCase()}: leads=${stActuals['leads']} migrated=${stActuals['migrated']}`);
        });
      } catch (_) {
        log.push('Candidates tabs not yet configured — skipping');
      }
      log.push(`Sources RJ=${sourcesRJ.length} OD=${sourcesOD.length} JH=${sourcesJH.length}`);
      log.push(`Employers=${employers.length} Profiles=${profiles.length}`);
      setData({
        actuals: mergedActuals as DataState['actuals'],
        conv,
        targets,
        sources: { rj: sourcesRJ as never, od: sourcesOD as never, jh: sourcesJH as never },
        employers,
        profiles,
        assignments,
        candidates,
      });
      setStatus('live');
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus('error');
      setError(msg);
      log.push('ERROR: ' + msg);
      console.error(e);
    }
    setDebugLog(log);
  }, []);

  return { data, status, lastRefresh, error, debugLog, fetchAllSheets };
}
