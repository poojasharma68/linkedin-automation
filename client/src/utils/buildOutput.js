const INDENT = '    ';

function formatEntry(entry) {
  return [
    '{',
    `${INDENT}url: ${JSON.stringify(entry.url)},`,
    `${INDENT}classes: ${JSON.stringify(entry.classes)},`,
    `${INDENT}image: ${JSON.stringify(entry.image)},`,
    `${INDENT}programme: ${JSON.stringify(entry.programme)}`,
    '},',
  ].join('\n');
}

// Whichever dimension the user varied is what the heading needs to disambiguate.
function buildHeading({ category, programme, categories, programmes }) {
  if (programmes.length === 1) return category;
  if (categories.length === 1) return programme;
  return `${category} · ${programme}`;
}

/**
 * One group per category x programme pair, since every output object carries a
 * single `classes` and a single `programme`. Each captured screenshot is reused
 * across the groups it belongs to — the URL is only screenshotted once.
 */
export function buildGroups({ results, categories, programmes }) {
  const captured = results.filter((result) => result.status === 'Completed' && result.cdnUrl);
  if (captured.length === 0 || categories.length === 0 || programmes.length === 0) return [];

  const groups = [];

  for (const category of categories) {
    for (const programme of programmes) {
      groups.push({
        id: `${category}::${programme}`,
        heading: buildHeading({ category, programme, categories, programmes }),
        entries: captured.map((result) => ({
          url: result.linkedinUrl,
          classes: category,
          image: result.cdnUrl,
          programme,
        })),
      });
    }
  }

  return groups;
}

export function serializeGroup(group, withHeading) {
  const body = group.entries.map(formatEntry).join('\n');
  return withHeading ? `// ${group.heading}\n${body}` : body;
}

// A single group needs no heading — there is nothing to tell it apart from.
export function serializeGroups(groups) {
  const withHeading = groups.length > 1;
  return groups.map((group) => serializeGroup(group, withHeading)).join('\n\n');
}

export function countEntries(groups) {
  return groups.reduce((total, group) => total + group.entries.length, 0);
}
