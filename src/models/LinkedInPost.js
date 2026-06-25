import mongoose from 'mongoose';
import { PROGRAMME_IDS, DEFAULT_PROGRAMME } from '../constants/programmes.js';

const linkedInPostSchema = new mongoose.Schema(
  {
    linkedinUrl: {
      type: String,
      required: [true, 'LinkedIn URL is required'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    programme: {
      type: String,
      enum: PROGRAMME_IDS,
      default: DEFAULT_PROGRAMME,
      trim: true,
      lowercase: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  }
);

linkedInPostSchema.index({ createdAt: -1 });
linkedInPostSchema.index({ category: 1, programme: 1, createdAt: -1 });

const LinkedInPost = mongoose.model('LinkedInPost', linkedInPostSchema);

export default LinkedInPost;
