export type NavTab = 'overview' | 'funnel' | 'sources' | 'conversions' | 'fieldops' | 'matching' | 'candidates';
export type StateView = 'all' | 'rj' | 'od' | 'jh';
export type FunnelMode = 'planning' | 'actuals';
export type MatchSubTab = 'match' | 'employers';
export type GSStatus = 'loading' | 'live' | 'error';

export interface StageDef {
  key: string;
  label: string;
  nudge: boolean;
  maybe: boolean;
}

export interface Role {
  name: string;
  type: string;
}

export interface Stage {
  key: string;
  label: string;
  nudge: boolean;
  maybe: boolean;
  owner: string;
  dropCause: string;
  recovery: string;
  roles: Role[];
}

export interface Fear {
  fear: string;
  response: string;
}

export interface PitchTemplate {
  label: string;
  icon: string;
  template: string;
}

export interface Source {
  id: string;
  name: string;
  type: string;
  subSource?: string;
  vol: string;
  conv_pct?: string;
  contact: string;
  districts: string;
  desc: string;
  action: string;
  status: string;
  _st?: string;
  [key: string]: string | undefined;
}

export interface Employer {
  id: string;
  name: string;
  sector: string;
  subsector: string;
  corridor: string;
  salary: string;
  vacancies: number;
  femaleRating: number;
  roles: string[];
  skills: string[];
  minQual: string;
  contact: string;
  phone?: string;
  notes: string;
  pitchType: string;
  [key: string]: unknown;
}

export interface SkillProfile {
  id: string;
  label: string;
  corridor: string;
  tags: string[];
  [key: string]: unknown;
}

export interface Actuals {
  leads?: number | null;
  outreach?: number | null;
  responded?: number | null;
  prequalified?: number | null;
  counselled?: number | null;
  parent_approved?: number | null;
  docs_complete?: number | null;
  interview?: number | null;
  selected?: number | null;
  offer_released?: number | null;
  migrated?: number | null;
  last_updated?: string | null;
  [key: string]: number | string | null | undefined;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  state: string;         // rj | od | jh
  district: string;
  qualification: string;
  stage: string;         // derived dashboard stage key
  stageOrder: number;    // 1–11
  currentStatus: string; // Active | Dropped
  employer: string;
  city: string;
  mobilisedDate: string;
  joiningDate: string;
  dropoutStage: string;
  dropoutReason: string;
  lastFollowup: string;
  remarks: string;
}

export interface WeeklyTarget {
  week_start: string;
  week_end: string;
  rj: number;
  od: number;
  jh: number;
}

export interface CalendarWeek {
  week_start: string;
  week_end: string;
  label: string;
  isCurrent: boolean;
  isPast: boolean;
  weekNum: number;
}

export interface DataState {
  actuals: { rj: Actuals; od: Actuals; jh: Actuals };
  conv: Record<string, number>;
  targets: { rj: number; od: number; jh: number };
  weeklyTargets: WeeklyTarget[];
  sources: { rj: Source[]; od: Source[]; jh: Source[] };
  employers: Employer[];
  profiles: SkillProfile[];
  assignments: Record<string, string[]>;
  candidates: Candidate[];
}

export interface LocalState {
  stages: Stage[];
  fears: Fear[];
  pitches: Record<string, PitchTemplate>;
}
