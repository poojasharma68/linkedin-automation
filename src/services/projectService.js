import Project, { DEFAULT_SHEET_RANGE } from '../models/Project.js';
import googleSheetsService from './googleSheetsService.js';
import { parseSpreadsheetId, buildGoogleSheetUrl } from '../utils/parseSpreadsheetId.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

class ProjectService {
  async findAll(filters = {}) {
    const query = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    return Project.find(query).sort({ createdAt: -1 }).lean();
  }

  async findById(id) {
    const project = await Project.findById(id).lean();

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    return project;
  }

  async findActiveProjects() {
    return Project.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async validateSheetAccess({ googleSheetUrl, spreadsheetId, sheetRange }) {
    let resolvedSpreadsheetId;
    let resolvedUrl;

    try {
      if (spreadsheetId) {
        const parsed = parseSpreadsheetId(spreadsheetId);
        resolvedSpreadsheetId = parsed.spreadsheetId;
        resolvedUrl = googleSheetUrl?.trim() || buildGoogleSheetUrl(resolvedSpreadsheetId);
      } else if (googleSheetUrl) {
        const parsed = parseSpreadsheetId(googleSheetUrl);
        resolvedSpreadsheetId = parsed.spreadsheetId;
        resolvedUrl = googleSheetUrl.trim();
      } else {
        throw ApiError.badRequest('Either googleSheetUrl or spreadsheetId is required');
      }
    } catch (error) {
      throw ApiError.badRequest(error.message);
    }

    const range = sheetRange?.trim() || DEFAULT_SHEET_RANGE;
    const sheetInfo = await googleSheetsService.validateSpreadsheetAccess(resolvedSpreadsheetId);

    return {
      spreadsheetId: resolvedSpreadsheetId,
      googleSheetUrl: resolvedUrl,
      sheetRange: range,
      title: sheetInfo.title,
    };
  }

  async connectSheet({ name, googleSheetUrl, spreadsheetId, sheetRange }) {
    if (!name?.trim()) {
      throw ApiError.badRequest('Project name is required');
    }

    const validated = await this.validateSheetAccess({ googleSheetUrl, spreadsheetId, sheetRange });

    const existing = await Project.findOne({ spreadsheetId: validated.spreadsheetId }).lean();
    if (existing) {
      throw ApiError.conflict('This Google Sheet is already connected to a project', {
        projectId: existing._id,
      });
    }

    await googleSheetsService.ensureHeaders(validated.spreadsheetId, validated.sheetRange);

    const project = await Project.create({
      name: name.trim(),
      googleSheetUrl: validated.googleSheetUrl,
      spreadsheetId: validated.spreadsheetId,
      sheetRange: validated.sheetRange,
    });

    logger.info('Google Sheet connected to project', {
      projectId: project._id,
      spreadsheetId: validated.spreadsheetId,
      sheetTitle: validated.title,
    });

    return project.toObject();
  }

  async updateSheetConnection(id, { googleSheetUrl, spreadsheetId, sheetRange, name, isActive }) {
    const project = await Project.findById(id);

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        throw ApiError.badRequest('Project name cannot be empty');
      }
      project.name = name.trim();
    }

    if (isActive !== undefined) {
      project.isActive = Boolean(isActive);
    }

    if (googleSheetUrl || spreadsheetId) {
      const validated = await this.validateSheetAccess({
        googleSheetUrl,
        spreadsheetId,
        sheetRange: sheetRange || project.sheetRange,
      });

      if (validated.spreadsheetId !== project.spreadsheetId) {
        const duplicate = await Project.findOne({
          spreadsheetId: validated.spreadsheetId,
          _id: { $ne: id },
        }).lean();

        if (duplicate) {
          throw ApiError.conflict('This Google Sheet is already connected to another project');
        }
      }

      await googleSheetsService.ensureHeaders(validated.spreadsheetId, validated.sheetRange);

      project.googleSheetUrl = validated.googleSheetUrl;
      project.spreadsheetId = validated.spreadsheetId;
      project.sheetRange = validated.sheetRange;

      logger.info('Project sheet connection updated', {
        projectId: id,
        spreadsheetId: validated.spreadsheetId,
        sheetTitle: validated.title,
      });
    } else if (sheetRange) {
      project.sheetRange = sheetRange.trim();
      await googleSheetsService.validateSpreadsheetAccess(project.spreadsheetId);
      await googleSheetsService.ensureHeaders(project.spreadsheetId, project.sheetRange);
    }

    await project.save();
    return project.toObject();
  }

  async deleteProject(id) {
    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    logger.info('Project deleted', { projectId: id });
    return project.toObject();
  }

  async markProcessed(id) {
    await Project.findByIdAndUpdate(id, { lastProcessedAt: new Date() });
  }
}

export default new ProjectService();
