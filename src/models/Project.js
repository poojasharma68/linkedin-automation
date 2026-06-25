import mongoose from 'mongoose';

const DEFAULT_SHEET_RANGE = 'Sheet1!A:C';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 120,
    },
    googleSheetUrl: {
      type: String,
      required: [true, 'Google Sheet URL is required'],
      trim: true,
    },
    spreadsheetId: {
      type: String,
      required: [true, 'Spreadsheet ID is required'],
      trim: true,
      index: true,
    },
    sheetRange: {
      type: String,
      default: DEFAULT_SHEET_RANGE,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  }
);

projectSchema.index({ spreadsheetId: 1 }, { unique: true });

const Project = mongoose.model('Project', projectSchema);

export { DEFAULT_SHEET_RANGE };
export default Project;
