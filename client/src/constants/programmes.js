export const ALL_PROGRAMMES = 'all';

export const PROGRAMMES = [
  { id: ALL_PROGRAMMES, label: 'All Programmes' },
  { id: 'ug', label: 'UG Programmes' },
  { id: 'pg', label: 'PG Programmes' },
  { id: 'executive', label: 'Executive Education' },
  { id: 'bharat', label: 'PGP Bharat' },
];

export const ADDABLE_PROGRAMMES = PROGRAMMES.filter((p) => p.id !== ALL_PROGRAMMES);

export const DEFAULT_PROGRAMME = ALL_PROGRAMMES;

export function getProgrammeLabel(id) {
  return PROGRAMMES.find((p) => p.id === id)?.label || id;
}

export default PROGRAMMES;
