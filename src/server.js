import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import linkedinBrowserService from './services/linkedinBrowserService.js';

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  await linkedinBrowserService.closeBrowser();

  process.exit(0);
}

async function bootstrap() {
  try {
    linkedinBrowserService.warmupBrowser().catch(() => {});

    const server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`, { env: env.NODE_ENV });
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
