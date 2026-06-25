import { google } from 'googleapis';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

const HEADER_ROW = ['linkedinUrl', 'category', 'status'];

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
  }

  async #getClient() {
    if (this.sheets) return this.sheets;

    const auth = new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }

  #parseRange(range) {
    const match = range.match(/^([^!]+)!([A-Z]+)(\d+):([A-Z]+)(\d+)?$/i);
    if (!match) {
      throw ApiError.badRequest(`Invalid sheet range format: ${range}`);
    }

    return {
      sheetName: match[1],
      startCol: match[2],
      startRow: parseInt(match[3], 10),
      endCol: match[4],
    };
  }

  #mapGoogleApiError(error, spreadsheetId) {
    const status = error?.response?.status || error?.code;
    const message = error?.message || 'Google Sheets API error';

    if (status === 404) {
      return ApiError.notFound(
        `Google Sheet not found for Spreadsheet ID "${spreadsheetId}". Verify the URL or ID is correct.`
      );
    }

    if (status === 403) {
      return ApiError.badRequest(
        `Google Sheet is not accessible. Share the sheet with the service account: ${env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
      );
    }

    if (status === 400) {
      return ApiError.badRequest(`Invalid Google Sheets request: ${message}`);
    }

    return ApiError.internal(`Google Sheets API error: ${message}`);
  }

  async #execute(operation, spreadsheetId) {
    try {
      return await operation();
    } catch (error) {
      logger.error('Google Sheets API request failed', {
        spreadsheetId,
        error: error.message,
        status: error?.response?.status,
      });
      throw this.#mapGoogleApiError(error, spreadsheetId);
    }
  }

  #rowToObject(row, rowIndex) {
    const [linkedinUrl = '', category = '', status = ''] = row;
    return {
      linkedinUrl: String(linkedinUrl).trim(),
      category: String(category).trim(),
      status: String(status).trim() || 'Pending',
      rowIndex,
    };
  }

  async validateSpreadsheetAccess(spreadsheetId) {
    const sheets = await this.#getClient();

    const response = await this.#execute(
      () =>
        sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'spreadsheetId,properties.title',
        }),
      spreadsheetId
    );

    return {
      spreadsheetId: response.data.spreadsheetId,
      title: response.data.properties?.title || null,
    };
  }

  async fetchPendingRows(spreadsheetId, range) {
    const sheets = await this.#getClient();

    const response = await this.#execute(
      () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        }),
      spreadsheetId
    );

    const rows = response.data.values || [];
    if (rows.length === 0) {
      logger.info('Google Sheet is empty', { spreadsheetId });
      return [];
    }

    const { startRow } = this.#parseRange(range);
    const dataStartIndex = rows[0]?.[0]?.toLowerCase() === 'linkedinurl' ? 1 : 0;
    const pendingRows = [];

    for (let i = dataStartIndex; i < rows.length; i += 1) {
      const row = this.#rowToObject(rows[i], startRow + i);
      if (!row.linkedinUrl) continue;

      if (row.status.toLowerCase() === 'pending') {
        pendingRows.push(row);
      }
    }

    logger.info(`Fetched ${pendingRows.length} pending row(s)`, { spreadsheetId });
    return pendingRows;
  }

  async updateRowStatus(spreadsheetId, range, rowIndex, status) {
    const sheets = await this.#getClient();
    const { sheetName, endCol } = this.#parseRange(range);
    const cellRange = `${sheetName}!${endCol}${rowIndex}`;

    await this.#execute(
      () =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: cellRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[status]],
          },
        }),
      spreadsheetId
    );

    logger.info(`Updated sheet row ${rowIndex} status to "${status}"`, { spreadsheetId });
  }

  async ensureHeaders(spreadsheetId, range) {
    const sheets = await this.#getClient();
    const { sheetName, startCol, startRow, endCol } = this.#parseRange(range);
    const headerRange = `${sheetName}!${startCol}${startRow}:${endCol}${startRow}`;

    const response = await this.#execute(
      () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: headerRange,
        }),
      spreadsheetId
    );

    const existing = response.data.values?.[0] || [];
    const normalized = existing.map((h) => String(h).toLowerCase());

    if (normalized.join(',') !== HEADER_ROW.join(',')) {
      await this.#execute(
        () =>
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: headerRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [HEADER_ROW],
            },
          }),
        spreadsheetId
      );
      logger.info('Google Sheet headers initialized', { spreadsheetId });
    }
  }
}

export default new GoogleSheetsService();
