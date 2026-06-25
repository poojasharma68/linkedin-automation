export const CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'tech', label: 'Tech' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'business', label: 'Business' },
  { id: 'design', label: 'Design' },
  { id: 'career', label: 'Career' },
  { id: 'other', label: 'Other' },
];

export const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all');

export default CATEGORIES;
