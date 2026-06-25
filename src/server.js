import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import categoryService from './services/categoryService.js';
import linkedinPostService from './services/linkedinPostService.js';
import { startProcessPostsCron, stopProcessPostsCron } from './cron/processPostsJob.js';
import linkedinBrowserService from './services/linkedinBrowserService.js';

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  stopProcessPostsCron();
  await linkedinBrowserService.closeBrowser();
  await disconnectDatabase();

  process.exit(0);
}

async function bootstrap() {
  try {
    await connectDatabase();
    await categoryService.seedDefaults();
    await linkedinPostService.resetStuckProcessing(1);

    startProcessPostsCron();

    linkedinBrowserService.warmupBrowser().catch(() => {});

    const server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`, {
        env: env.NODE_ENV,
        cronEnabled: env.CRON_ENABLED,
        cronSchedule: env.CRON_SCHEDULE,
      });
    });

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.on('error', (error) => {
      logger.error('Server error', { error: error.message });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

bootstrap();
