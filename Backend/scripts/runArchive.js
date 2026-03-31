import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  ensureArchiveCollections,
  runAllArchiveOperations,
  getArchiveStats
} from '../utils/archive.js';
import connectDB from '../config/db.js';

dotenv.config();

/**
 * Manual Archive Script
 * Usage: npm run archive:run
 * Archives old records according to retention policies
 */

const runArchiveScript = async () => {
  try {
    console.log('🔄 Starting archive process...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Database connected\n');

    // Ensure archive collections exist
    console.log('📦 Ensuring archive collections exist...');
    await ensureArchiveCollections();
    console.log('✅ Archive collections ready\n');

    // Get initial stats
    console.log('📊 Initial archive stats:');
    const initialStats = await getArchiveStats();
    console.log(JSON.stringify(initialStats, null, 2));
    console.log();

    // Run archival operations
    console.log('🔄 Running archive operations...');
    const results = await runAllArchiveOperations();
    
    console.log('\n📋 Archive Results:');
    console.log('─'.repeat(50));
    
    for (const [type, data] of Object.entries(results)) {
      if (type !== 'timestamp' && type !== 'summary' && typeof data === 'object') {
        console.log(`\n${type.toUpperCase()}:`);
        console.log(`  Archived: ${data.archived || 0}`);
        console.log(`  Deleted: ${data.deleted || 0}`);
        if (data.error) console.log(`  Error: ${data.error}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Total Archived: ${results.summary.totalArchived}`);
    console.log(`  Total Deleted: ${results.summary.totalDeleted}`);
    
    // Get final stats
    console.log('\n📊 Final archive stats:');
    const finalStats = await getArchiveStats();
    console.log(JSON.stringify(finalStats, null, 2));

    console.log('\n✅ Archive process completed successfully!');
    
    // Close connection
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Archive process failed:', error);
    process.exit(1);
  }
};

// Run the script
runArchiveScript();
