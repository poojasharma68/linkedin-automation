import cron from 'node-cron';
import env from '../config/env.js';
import logger from '../config/logger.js';
import linkedinPostService from '../services/linkedinPostService.js';

let cronJob = null;
let isRunning = false;

async function runProcessJob(trigger = 'cron') {
  if (isRunning) {
    logger.warn('Skipping scheduled job; previous run still in progress', { trigger });
    return;
  }

  isRunning = true;
  logger.info('Starting scheduled LinkedIn post processing', { trigger });

  try {
    const summary = await linkedinPostService.processPendingQueue();
    logger.info('Scheduled job finished', { trigger, ...summary });
  } catch (error) {
    logger.error('Scheduled job failed', { trigger, error: error.message });
  } finally {
    isRunning = false;
  }
}

export function startProcessPostsCron() {
  if (!env.CRON_ENABLED) {
    logger.info('Cron job is disabled via CRON_ENABLED=false');
    return;
  }

  if (!cron.validate(env.CRON_SCHEDULE)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${env.CRON_SCHEDULE}`);
  }

  cronJob = cron.schedule(env.CRON_SCHEDULE, () => {
    runProcessJob('cron');
  });

  logger.info('Process posts cron job scheduled', { schedule: env.CRON_SCHEDULE });
}

export function stopProcessPostsCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Process posts cron job stopped');
  }
}

export { runProcessJob };

export default { startProcessPostsCron, stopProcessPostsCron, runProcessJob };
