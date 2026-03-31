import cron from 'node-cron';
import { runAllArchiveOperations, getArchiveStats } from '../utils/archive.js';

/**
 * Archive Maintenance Jobs
 * Scheduled tasks for data archival and cleanup
 */

let archiveJobSchedule = null;

/**
 * Schedule archive operations to run at 2 AM daily
 */
export const scheduleArchiveJobs = () => {
  try {
    // Run daily at 2 AM
    archiveJobSchedule = cron.schedule('0 2 * * *', async () => {
      console.log('[Archive Job] Starting daily archive operations...');
      try {
        const results = await runAllArchiveOperations();
        console.log('[Archive Job] Completed:', results.summary);
        
        // Log stats
        const stats = await getArchiveStats();
        console.log('[Archive Job] Archive collection stats:', stats);
      } catch (error) {
        console.error('[Archive Job] Error during archive operation:', error);
      }
    }, {
      scheduled: false // Start manually
    });

    // Start the job
    if (archiveJobSchedule) {
      archiveJobSchedule.start();
      console.log('[Archive Jobs] Scheduled - runs daily at 2:00 AM');
    }

  } catch (error) {
    console.error('Failed to schedule archive jobs:', error);
  }
};

/**
 * Run archive operations immediately (admin trigger)
 */
export const triggerArchiveNow = async () => {
  try {
    console.log('Triggering immediate archive operation...');
    const results = await runAllArchiveOperations();
    const stats = await getArchiveStats();
    
    return {
      success: true,
      results,
      stats
    };
  } catch (error) {
    console.error('Error triggering archive:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Stop archive job
 */
export const stopArchiveJob = () => {
  if (archiveJobSchedule) {
    archiveJobSchedule.stop();
    console.log('[Archive Jobs] Stopped');
  }
};

export default {
  scheduleArchiveJobs,
  triggerArchiveNow,
  stopArchiveJob
};
