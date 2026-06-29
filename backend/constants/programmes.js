export const PROGRAMMES = [
  { id: 'ug', label: 'UG Programmes' },
  { id: 'pg', label: 'PG Programmes' },
  { id: 'executive', label: 'Executive Education' },
  { id: 'bharat', label: 'PGP Bharat' },
];

export const PROGRAMME_IDS = PROGRAMMES.map((programme) => programme.id);

export const DEFAULT_PROGRAMME = 'ug';

export const ALL_PROGRAMMES = 'all';

export function isValidProgramme(value) {
  return PROGRAMME_IDS.includes(value);
}

export function normalizeProgramme(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return isValidProgramme(normalized) ? normalized : null;
}

export default PROGRAMMES;
