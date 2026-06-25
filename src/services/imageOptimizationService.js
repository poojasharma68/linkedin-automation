import sharp from 'sharp';
import logger from '../config/logger.js';

class ImageOptimizationService {
  constructor() {
    this.defaultQuality = 85;
    this.maxWidth = 1920;
  }

  async convertToWebP(inputBuffer, options = {}) {
    const quality = options.quality ?? this.defaultQuality;
    const maxWidth = options.maxWidth ?? this.maxWidth;

    const optimized = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({
        quality,
        effort: 4,
      })
      .toBuffer();

    const metadata = await sharp(optimized).metadata();

    logger.debug('Image optimized to WebP', {
      width: metadata.width,
      height: metadata.height,
      sizeBytes: optimized.length,
    });

    return optimized;
  }
}

export default new ImageOptimizationService();
