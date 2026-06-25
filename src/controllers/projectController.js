import projectService from '../services/projectService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getProjects = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  const projects = await projectService.findAll({ isActive });

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.findById(req.params.id);

  res.status(200).json({
    success: true,
    data: project,
  });
});

export const connectSheet = asyncHandler(async (req, res) => {
  const { name, googleSheetUrl, spreadsheetId, sheetRange } = req.body;

  const project = await projectService.connectSheet({
    name,
    googleSheetUrl,
    spreadsheetId,
    sheetRange,
  });

  res.status(201).json({
    success: true,
    message: 'Google Sheet connected successfully',
    data: project,
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const { name, googleSheetUrl, spreadsheetId, sheetRange, isActive } = req.body;

  const project = await projectService.updateSheetConnection(req.params.id, {
    name,
    googleSheetUrl,
    spreadsheetId,
    sheetRange,
    isActive,
  });

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: project,
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await projectService.deleteProject(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
    data: project,
  });
});

export const validateSheet = asyncHandler(async (req, res) => {
  const { googleSheetUrl, spreadsheetId, sheetRange } = req.body;

  const result = await projectService.validateSheetAccess({
    googleSheetUrl,
    spreadsheetId,
    sheetRange,
  });

  res.status(200).json({
    success: true,
    message: 'Google Sheet is valid and accessible',
    data: result,
  });
});

export default {
  getProjects,
  getProjectById,
  connectSheet,
  updateProject,
  deleteProject,
  validateSheet,
};
