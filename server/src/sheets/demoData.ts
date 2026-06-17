import type { SheetRecord } from '../domain/crm.js';

/**
 * Sample data for DEMO mode (DEMO=1). Lets you run the full app with no Google
 * setup. Values mirror the real sheet's shape (Origin sells construction robots
 * on a per-robot monthly subscription). Dates are set so the dashboard's
 * "needs attention" sections have something to show around mid-2026.
 */
export const DEMO_DEALS: SheetRecord[] = [
  {
    _row: 2, company: 'Imperial Painting & Coatings LLC', owner: 'Punith', stage: 'Qualifying',
    probability: 20, forecastCategory: 'Pipeline', robotsPotential: 3, robotsSigned: null,
    mrrPotential: 60000, mrrSigned: null, arrPotential: 720000, arrSigned: null,
    closeDate: '', nextStep: 'Follow up with V2 — wanted site demo, went quiet',
    due: '2026-06-01', lastActivity: '2026-03-23', notes: '',
  },
  {
    _row: 3, company: 'PCI / PCG', owner: 'Punith', stage: 'Demo',
    probability: 40, forecastCategory: 'Pipeline', robotsPotential: 60, robotsSigned: null,
    mrrPotential: 1200000, mrrSigned: null, arrPotential: 14400000, arrSigned: null,
    closeDate: '2026-12-15', nextStep: 'Prep Jul demo; draft agreement sent Jun 2',
    due: '2026-07-01', lastActivity: '2026-06-02', notes: 'Enterprise motion — run separately from SMB cadence.',
  },
  {
    _row: 4, company: 'Curtis Partition Corp.', owner: 'Punith', stage: 'Demo',
    probability: 40, forecastCategory: 'Pipeline', robotsPotential: 50, robotsSigned: null,
    mrrPotential: 1000000, mrrSigned: null, arrPotential: 12000000, arrSigned: null,
    closeDate: '2027-03-31', nextStep: 'Re-engage with pilot proposal',
    due: '2026-06-20', lastActivity: '2025-12-15', notes: '~$40M+ MBE. Turner sub.',
  },
  {
    _row: 5, company: 'Indigo Painters', owner: 'Punith', stage: 'Pilot',
    probability: 60, forecastCategory: 'Best Case', robotsPotential: 10, robotsSigned: null,
    mrrPotential: 200000, mrrSigned: null, arrPotential: 2400000, arrSigned: null,
    closeDate: '2026-08-31', nextStep: 'Present contract — pilot completed Dec ’25',
    due: '2026-06-16', lastActivity: '2025-12-31', notes: 'Pilot-to-contract conversion overdue ~6 months.',
  },
  {
    _row: 6, company: 'Horizon Framing', owner: 'Punith', stage: 'Negotiation',
    probability: 85, forecastCategory: 'Commit', robotsPotential: 10, robotsSigned: null,
    mrrPotential: 200000, mrrSigned: null, arrPotential: 2400000, arrSigned: null,
    closeDate: '2026-07-31', nextStep: 'Re-engage — offer restructured terms',
    due: '2026-06-15', lastActivity: '2026-03-09', notes: 'Legal entity: Horizon Interiors Inc.',
  },
  {
    _row: 7, company: 'Konkrete NY', owner: 'Punith', stage: 'Closed Won',
    probability: 100, forecastCategory: 'Closed', robotsPotential: 10, robotsSigned: 10,
    mrrPotential: 200000, mrrSigned: 200000, arrPotential: 2400000, arrSigned: 2400000,
    closeDate: '2026-01-15', nextStep: 'Verify May deployment status',
    due: '2026-06-13', lastActivity: '2026-03-03', notes: 'Deploy May ’26 per contract.',
  },
  {
    _row: 8, company: 'Artistic Paint USA', owner: 'Punith', stage: 'Closed Won',
    probability: 100, forecastCategory: 'Closed', robotsPotential: 10, robotsSigned: 10,
    mrrPotential: 200000, mrrSigned: 200000, arrPotential: 2400000, arrSigned: 2400000,
    closeDate: '2026-02-15', nextStep: 'Confirm Jun ’26 deployment logistics',
    due: '2026-06-13', lastActivity: '2026-03-03', notes: 'Williamsburg network anchor account.',
  },
  {
    _row: 9, company: 'JLM Decorating', owner: 'Punith', stage: 'On Hold',
    probability: 10, forecastCategory: 'Omitted', robotsPotential: 10, robotsSigned: null,
    mrrPotential: 200000, mrrSigned: null, arrPotential: 2400000, arrSigned: null,
    closeDate: '2026-12-31', nextStep: 'Re-approach with V2 robot',
    due: '2026-07-01', lastActivity: '2026-03-11', notes: 'Hotels/luxury. Wants V2.',
  },
];

export const DEMO_LEADS: SheetRecord[] = [
  {
    _row: 2, company: 'Aroundtown', leadStatus: 'Qualified (Convert to Deal)', owner: 'Punith',
    priority: 1, icpSegment: 'P1 Large', source: 'Enriched', contact: 'Simina Stoicea',
    title: 'Deputy CTO', phone: '', email: '', state: '', tradeFit: 'Owner/developer',
    nextStep: 'Send data room + pilot intake forms', notes: 'Germany/EU owner-developer via ATechX.', convertRank: 1,
  },
  {
    _row: 3, company: 'A.G. Williams Painting Company', leadStatus: 'New', owner: 'Punith',
    priority: 3, icpSegment: 'P0 Small', source: 'Google', contact: 'George Williams',
    title: 'VP of Operations', phone: '(914) 738-2860', email: '', state: 'NY', tradeFit: 'Painting',
    nextStep: 'Initial outreach', notes: 'Pelham. Family-owned since 1906.', convertRank: null,
  },
  {
    _row: 4, company: 'Beitel Group', leadStatus: 'Connected', owner: 'Punith',
    priority: 2, icpSegment: '', source: 'WoM', contact: 'Ben Beitel',
    title: 'CEO', phone: '347-243-0535', email: 'bbeitel@beitel.com', state: 'NY',
    tradeFit: 'Owner/developer (hotels)', nextStep: 'Book discovery call', notes: 'Alt: 718-977-5663 ext 201.', convertRank: null,
  },
  {
    _row: 5, company: 'Cavanaugh Wall Solutions', leadStatus: 'Attempted to Contact', owner: 'Punith',
    priority: 3, icpSegment: 'P0 Small', source: 'GC Intro', contact: 'Bob Cavanaugh',
    title: 'Field Operations', phone: '917-750-1388', email: 'bob@cavanaugh-wall.com', state: 'NY',
    tradeFit: 'Compounding', nextStep: 'Qualify via Turner — Dropbox HQ, 30 Rock', notes: '', convertRank: null,
  },
  {
    _row: 6, company: 'CBI Drywall Corporation', leadStatus: 'New', owner: 'Punith',
    priority: 3, icpSegment: 'P0 Mid-Market', source: 'Bluebook', contact: '',
    title: '', phone: '(631) 491-4700', email: '', state: 'NY', tradeFit: 'Compounding',
    nextStep: 'Initial outreach', notes: 'Farmingdale, est 1981.', convertRank: null,
  },
  {
    _row: 7, company: 'Custom Design Innovations', leadStatus: 'New', owner: 'Punith',
    priority: 3, icpSegment: 'P3 Micro', source: 'Enriched', contact: '',
    title: '', phone: '', email: '', state: 'NY', tradeFit: 'Compounding',
    nextStep: 'Initial outreach', notes: 'MBE union, est 2017.', convertRank: null,
  },
];
