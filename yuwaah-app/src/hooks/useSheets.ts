import { useState, useCallback } from 'react';
import type { DataState, GSStatus } from '../types';
import { SHEET_URLS } from '../constants';
import {
  parseCSV, parseConv, parseTargets,
  parseSources, parseEmployers, parseProfiles, parseAssignments,
  parseCandidates, parseCandidateActuals, parseWeeklyTargets,
} from '../utils';

const initialData: DataState = {
  actuals: { rj: {}, od: {}, jh: {} },
  conv: {},
  targets: { rj: 280, od: 200, jh: 120 },
  weeklyTargets: [],
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
    return parseCSV(await r.text());
  };

  const fetchAllSheets = useCallback(async () => {
    setStatus('loading');
    const log: string[] = [];
    try {
      log.push('Fetching sheets…');

      // Core sheets (non-candidate)
      const [convR, tgtR, srcRJ, srcOD, srcJH, empR, profR, asgnR, wkTgtR] = await Promise.all([
        fetchSheet('Conv_Ratios'), fetchSheet('Targets'),
        fetchSheet('Sources_RJ'), fetchSheet('Sources_OD'), fetchSheet('Sources_JH'),
        fetchSheet('Employers'), fetchSheet('Skill_Profiles'), fetchSheet('Assignments'),
        fetchSheet('Weekly_Targets').catch(() => [] as string[][]),
      ]);

      const conv = parseConv(convR);
      const targets = parseTargets(tgtR);
      const sourcesRJ = parseSources(srcRJ);
      const sourcesOD = parseSources(srcOD);
      const sourcesJH = parseSources(srcJH);
      const employers = parseEmployers(empR);
      const profiles = parseProfiles(profR);
      const assignments = parseAssignments(asgnR);
      const weeklyTargets = parseWeeklyTargets(wkTgtR);
      log.push(`Weekly targets: ${weeklyTargets.length} rows`);

      // Candidate sheets — compute actuals from active candidates by stage
      // Column indices (0-based): AD=29, AE=30, AF=31, AG=32
      const [odResult, rjResult, jhResult] = await Promise.allSettled([
        fetchSheet('Candidates_OD'),
        fetchSheet('Candidates_RJ'),
        fetchSheet('Candidates_JH'),
      ]);

      const odRows = odResult.status === 'fulfilled' ? odResult.value : [];
      const rjRows = rjResult.status === 'fulfilled' ? rjResult.value : [];
      const jhRows = jhResult.status === 'fulfilled' ? jhResult.value : [];

      // OD: Stage=AF(31), Status=AG(32)
      // RJ: Stage=AD(29), Status=AE(30)
      // JH: Stage=AF(31), Status=AG(32)
      const actualsOD = parseCandidateActuals(odRows, 31, 32);
      const actualsRJ = parseCandidateActuals(rjRows, 29, 30);
      const actualsJH = parseCandidateActuals(jhRows, 31, 32);

      const counts = [odResult, rjResult, jhResult].map((r, i) =>
        `${['OD', 'RJ', 'JH'][i]}=${r.status === 'fulfilled' ? r.value.length - 1 : 'skip'}`
      );
      log.push(`Candidate rows ${counts.join(' ')}`);
      log.push(`Active counts — RJ migrated=${actualsRJ.migrated ?? 0} OD migrated=${actualsOD.migrated ?? 0} JH migrated=${actualsJH.migrated ?? 0}`);

      const candidates = [
        ...parseCandidates(odRows),
        ...parseCandidates(rjRows),
        ...parseCandidates(jhRows),
      ];
      log.push(`Tracker candidates: ${candidates.length}`);
      log.push(`Sources RJ=${sourcesRJ.length} OD=${sourcesOD.length} JH=${sourcesJH.length}`);
      log.push(`Employers=${employers.length} Profiles=${profiles.length}`);

      setData({
        actuals: { rj: actualsRJ, od: actualsOD, jh: actualsJH },
        conv,
        targets,
        weeklyTargets,
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
