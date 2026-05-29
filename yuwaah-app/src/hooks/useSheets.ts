import { useState, useCallback } from 'react';
import type { DataState, GSStatus } from '../types';
import { SHEET_URLS, STAGE_KEYS } from '../constants';
import {
  parseCSV, parseConv, parseTargets,
  parseSources, parseEmployers, parseProfiles, parseAssignments,
  parseCandidates, parseWeeklyTargets,
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

      const counts = [odResult, rjResult, jhResult].map((r, i) =>
        `${['OD', 'RJ', 'JH'][i]}=${r.status === 'fulfilled' ? r.value.length - 1 : 'skip'}`
      );
      log.push(`Candidate rows ${counts.join(' ')}`);

      const candidates = [
        ...parseCandidates(odRows),
        ...parseCandidates(rjRows),
        ...parseCandidates(jhRows),
      ];
      log.push(`Tracker candidates: ${candidates.length}`);

      // Derive actuals from parsed candidates — same stage logic as the tracker
      const mkActuals = (state: string) => {
        const stageCounts: Record<string, number> = Object.fromEntries(STAGE_KEYS.map(k => [k, 0]));
        candidates
          .filter(c => c.state === state && c.currentStatus.toLowerCase() === 'active')
          .forEach(c => { if (c.stage) stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });
        return stageCounts;
      };
      const actualsRJ = mkActuals('rj');
      const actualsOD = mkActuals('od');
      const actualsJH = mkActuals('jh');
      log.push(`Active counts — RJ migrated=${actualsRJ.migrated ?? 0} OD migrated=${actualsOD.migrated ?? 0} JH migrated=${actualsJH.migrated ?? 0}`);
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
