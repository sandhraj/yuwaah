import type { StageDef, Stage, Fear, PitchTemplate } from '../types';

export const SHEET_ID = '1XY1ROj_Fy9OrUdaJu0Wot1BsAeLbveD6Y5qlKyy2FVk';

export const SHEET_URLS: Record<string, string> = {
  Actuals: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1331708031&single=true&output=csv',
  Conv_Ratios: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=178971943&single=true&output=csv',
  Targets: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=2033753290&single=true&output=csv',
  Sources_RJ: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=400762651&single=true&output=csv',
  Sources_OD: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=914285618&single=true&output=csv',
  Sources_JH: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=260100290&single=true&output=csv',
  Employers: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1925224735&single=true&output=csv',
  Skill_Profiles: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1575252389&single=true&output=csv',
  Assignments: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1389124769&single=true&output=csv',
  // TODO: replace each GID below after copying your state tracker tabs into this sheet
  // and publishing: File → Share → Publish to web → select tab → CSV → Publish
  Candidates_OD: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=924876789&single=true&output=csv',
  Candidates_RJ: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1861962451&single=true&output=csv',
  Candidates_JH: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpET-ikaApsi7jA8iMDD0Ou2o9dZbMIXnCgx2tTSufCcFKIYsD6Dl2dbN-nJgLsPVSypDVTg7ap8bZ/pub?gid=1861412633&single=true&output=csv',
};

export const CHANNEL_COLORS: Record<string, string> = {
  'Community Mobilisation': '#D85A30',
  'Training & Education Institutions': '#3266AD',
  'Government Ecosystem': '#1D9E75',
  'Referral-Based Sourcing': '#BA7517',
  'Digital / WhatsApp Campaigns': '#888780',
  'Employer-Linked Sourcing': '#7B3FA0',
  'Other': '#4A9BB5',
};

export const STAGE_DEFS: StageDef[] = [
  { key: 'leads', label: 'Lead pool', nudge: false, maybe: false },
  { key: 'outreach', label: 'Outreach', nudge: true, maybe: false },
  { key: 'responded', label: 'Responded', nudge: true, maybe: false },
  { key: 'prequalified', label: 'Pre-qual', nudge: true, maybe: true },
  { key: 'counselled', label: 'Counselled', nudge: false, maybe: false },
  { key: 'parent_approved', label: 'Parent approval', nudge: false, maybe: false },
  { key: 'docs_complete', label: 'Document collection', nudge: false, maybe: false },
  { key: 'interview', label: 'Interview', nudge: false, maybe: false },
  { key: 'selected', label: 'Selection', nudge: false, maybe: false },
  { key: 'offer_released', label: 'Offer received', nudge: false, maybe: false },
  { key: 'wysa', label: 'Wysa session', nudge: false, maybe: false },
  { key: 'p2e', label: 'P2E', nudge: false, maybe: false },
  { key: 'migrated', label: 'Migration', nudge: false, maybe: false },
];

export const STAGE_KEYS = STAGE_DEFS.map((s) => s.key);

export const CONV_ORDER = [
  'r_outreach', 'r_responded', 'r_preq', 'r_counsel', 'r_parent',
  'r_docs', 'r_interview', 'r_selected', 'r_offer', 'r_wysa', 'r_p2e', 'r_migrated',
];

export const CONV_LABELS: Record<string, string> = {
  r_outreach: 'Lead pool → Outreach',
  r_responded: 'Outreach → Responded',
  r_preq: 'Responded → Pre-qual',
  r_counsel: 'Pre-qual → Counselled',
  r_parent: 'Counselled → Parent approval',
  r_docs: 'Parent approval → Document collection',
  r_interview: 'Document collection → Interview',
  r_selected: 'Interview → Selection',
  r_offer: 'Selection → Offer received',
  r_wysa: 'Offer received → Wysa session',
  r_p2e: 'Wysa session → P2E',
  r_migrated: 'P2E → Migration',
};

export const DEFAULT_CONV: Record<string, number> = {
  r_outreach: 65, r_responded: 30, r_preq: 45, r_counsel: 60,
  r_parent: 58, r_docs: 67, r_interview: 85, r_selected: 65,
  r_offer: 90, r_wysa: 95, r_p2e: 95, r_migrated: 82,
};

export const DEFAULT_STAGES: Stage[] = [
  { key: 'leads', label: 'Lead pool', nudge: false, maybe: false, owner: 'Raju + Megna', dropCause: 'Form friction, no callback', recovery: '30-min callback SLA, WhatsApp opt-in', roles: [{ name: 'Raju', type: 'Lead manager' }, { name: 'Megna', type: 'Campaign manager' }] },
  { key: 'outreach', label: 'Nudgebay outreach', nudge: true, maybe: false, owner: 'Nudgebay bot', dropCause: 'Not reachable', recovery: 'IVR / WhatsApp auto-sequence', roles: [{ name: 'Nudgebay bot', type: 'Automation' }] },
  { key: 'responded', label: 'Responded', nudge: true, maybe: false, owner: 'Nudgebay bot', dropCause: 'No response to bot', recovery: 'Re-attempt 48h, switch channel', roles: [{ name: 'Nudgebay bot', type: 'Automation' }] },
  { key: 'prequalified', label: 'Pre-qualified', nudge: true, maybe: true, owner: 'Nudgebay → field handoff', dropCause: 'Ineligible / not interested / Maybe', recovery: 'Maybe → 21-day drip; reactivation D+21', roles: [{ name: 'Nudgebay bot', type: 'Automation' }, { name: 'Raju', type: 'Handoff review' }] },
  { key: 'counselled', label: 'Counselled', nudge: false, maybe: false, owner: 'State counsellors', dropCause: 'Fear, lack of info', recovery: '2nd call 24h; parent conf call', roles: [{ name: 'Ipsita', type: 'OD' }, { name: 'Diya', type: 'RJ-Jodhpur' }, { name: 'Kalpana', type: 'RJ-Jaipur' }, { name: 'Yamana', type: 'OD online' }, { name: 'Krishna', type: 'JH' }] },
  { key: 'parent_approved', label: 'Parent approved', nudge: false, maybe: false, owner: 'Field coordinators', dropCause: 'Family resistance', recovery: 'Senior female counsellor; community event', roles: [{ name: 'Boris', type: 'RJ' }, { name: 'Harsh', type: 'RJ' }, { name: 'Niranjan', type: 'OD Kantar' }, { name: 'Bipin', type: 'JH Kantar' }, { name: 'Yamana', type: 'OD' }] },
  { key: 'docs_complete', label: 'Docs complete', nudge: false, maybe: false, owner: 'Ops leads', dropCause: 'Missing docs', recovery: 'Checklist D-7; doc runner deployed', roles: [{ name: 'Boris', type: 'RJ' }, { name: 'Yamana', type: 'OD' }, { name: 'Krishna', type: 'JH' }] },
  { key: 'interview', label: 'Interview scheduled', nudge: false, maybe: false, owner: 'Placement officers', dropCause: 'No-show', recovery: 'Reschedule 72h', roles: [{ name: 'Anushreya', type: 'OD' }, { name: 'Jitender', type: 'RJ' }, { name: 'Bipin', type: 'JH' }] },
  { key: 'selected', label: 'Employer selected', nudge: false, maybe: false, owner: 'Placement officers', dropCause: 'Employer rejection', recovery: 'Alternate employer if rejected', roles: [{ name: 'Sandheep', type: 'POC' }, { name: 'Ajay', type: 'Director' }] },
  { key: 'offer_released', label: 'Offer received', nudge: false, maybe: false, owner: 'Placement officers', dropCause: 'Last-minute withdrawal', recovery: 'Immediate counsellor call; SOP D+0', roles: [{ name: 'Sandheep', type: 'POC' }] },
  { key: 'wysa', label: 'Wysa session', nudge: false, maybe: false, owner: 'Wysa / counsellors', dropCause: 'No-show / not completed', recovery: 'Reschedule within 48h', roles: [] },
  { key: 'p2e', label: 'P2E', nudge: false, maybe: false, owner: 'Training coordinators', dropCause: 'Dropout during training', recovery: 'Re-engage within 7 days', roles: [] },
  { key: 'migrated', label: 'Migration', nudge: false, maybe: false, owner: 'Travel coordinators', dropCause: 'Last-minute withdrawal', recovery: 'Dropout recovery SOP D+0 to D+7', roles: [{ name: 'Boris', type: 'RJ' }, { name: 'Yamana', type: 'OD' }, { name: 'Krishna', type: 'JH' }] },
];

export const DEFAULT_FEARS: Fear[] = [
  { fear: 'I will have to live alone', response: 'You travel in a batch of 20–30 women from the same region. You will not be alone.' },
  { fear: 'Will I actually receive my salary?', response: 'Show bank statement from a verified alumna. Reference ESIC and PF registration.' },
  { fear: 'When can I come back home?', response: 'State exact leave policy. First home leave at 3 months.' },
  { fear: 'I do not know the language', response: 'Supervisor speaks Hindi. Local language support during onboarding.' },
  { fear: 'What if something goes wrong?', response: 'You get a Sambhav Foundation field contact. We do not disappear after joining.' },
  { fear: 'I am already working', response: 'Compare salary, PF, ESI, accommodation honestly. Show the security difference.' },
  { fear: 'Cannot migrate — family situation', response: 'Understand the constraint. If not the right time, log as Migration Issue and add to 90-day re-engagement list.' },
];

export const DEFAULT_PITCHES: Record<string, PitchTemplate> = {
  bpo: { label: 'BPO / Customer Support', icon: '🎧', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nOpening at {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nBenefits: PF, ESI, transport\nQualification: {min_qual}\n\nReply YES — counsellor calls within 30 minutes.' },
  garment: { label: 'Garment / Apparel', icon: '🧵', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nPlacement at {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nBenefits: PF, ESI, canteen, women safety officer\nQualification: {min_qual}\n\nReply YES — counsellor calls within 30 minutes.' },
  warehouse: { label: 'Warehouse / E-commerce', icon: '📦', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nOpening at {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nWomen-only morning shifts. PF, ESI, free transport.\nQualification: {min_qual}\n\nReply YES — we call within 30 minutes.' },
  electronics: { label: 'Electronics / EV', icon: '⚡', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nYour technical background matches {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nPF, ESI, health insurance, training.\nQualification: {min_qual}\n\nReply YES to learn more.' },
  auto: { label: 'Automotive / Engineering', icon: '🔧', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nOpening at {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nPF, ESI, on-the-job training.\nQualification: {min_qual}\n\nReply YES — counsellor calls within 30 minutes.' },
  healthcare: { label: 'Healthcare / Hospital', icon: '🏥', template: 'Hello {candidate_name}, Sambhav Foundation here.\n\nHealthcare placement at {employer_name} in {city}.\nRole: {role} | Salary: {salary}\nPF, ESI, uniform, structured training.\nQualification: {min_qual}\n\nReply YES — we call within 30 minutes.' },
};
