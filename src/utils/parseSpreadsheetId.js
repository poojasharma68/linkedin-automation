const SPREADSHEET_URL_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const SPREADSHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;

/**
 * Extracts a Google Spreadsheet ID from a URL or raw ID string.
 * @param {string} input - Google Sheet URL or Spreadsheet ID
 * @returns {{ spreadsheetId: string, source: 'url' | 'id' }}
 */
export function parseSpreadsheetId(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Google Sheet URL or Spreadsheet ID is required');
  }

  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Google Sheet URL or Spreadsheet ID cannot be empty');
  }

  const urlMatch = trimmed.match(SPREADSHEET_URL_PATTERN);
  if (urlMatch) {
    return { spreadsheetId: urlMatch[1], source: 'url' };
  }

  if (SPREADSHEET_ID_PATTERN.test(trimmed)) {
    return { spreadsheetId: trimmed, source: 'id' };
  }

  throw new Error(
    'Invalid Google Sheet URL or Spreadsheet ID. Expected a URL like https://docs.google.com/spreadsheets/d/{id}/edit or a valid Spreadsheet ID'
  );
}

export function buildGoogleSheetUrl(spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export default { parseSpreadsheetId, buildGoogleSheetUrl };
