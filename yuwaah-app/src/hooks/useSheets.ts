import { useState, useCallback } from 'react';
import type { DataState, GSStatus } from '../types';
import { SHEET_URLS } from '../constants';
import {
  parseCSV, parseActuals, parseConv, parseTargets,
  parseSources, parseEmployers, parseProfiles, parseAssignments,
} from '../utils';

const initialData: DataState = {
  actuals: { rj: {}, od: {}, jh: {} },
  conv: {},
  targets: { rj: 280, od: 200, jh: 120 },
  sources: { rj: [], od: [], jh: [] },
  employers: [],
  profiles: [],
  assignments: {},
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
      log.push(`Sources RJ=${sourcesRJ.length} OD=${sourcesOD.length} JH=${sourcesJH.length}`);
      log.push(`Employers=${employers.length} Profiles=${profiles.length}`);
      setData({
        actuals,
        conv,
        targets,
        sources: { rj: sourcesRJ as never, od: sourcesOD as never, jh: sourcesJH as never },
        employers,
        profiles,
        assignments,
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
