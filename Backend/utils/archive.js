import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Fine from '../models/Fine.js';
import Salary from '../models/Salary.js';
import SalesTarget from '../models/SalesTarget.js';
import Message from '../models/Message.js';

/**
 * Archive Manager
 * Handles archival and cleanup of old records to maintain database performance
 */

/**
 * Archive configuration
 * Define retention periods for different record types
 */
export const ARCHIVE_CONFIG = {
  // Attendance: Keep 1 year of data, archive everything older
  attendance: {
    retentionDays: 365,
    collectionName: 'attendance_archive',
    indexes: [
      { fields: { employee: 1, date: 1 }, options: {} },
      { fields: { date: 1 }, options: {} }
    ]
  },
  
  // Fine: Keep 2 years, archive older approved fines
  fine: {
    retentionDays: 730,
    collectionName: 'fine_archive',
    archiveIfApproved: true, // Only archive approved fines
    indexes: [
      { fields: { employee: 1, date: 1 }, options: {} },
      { fields: { date: 1 }, options: {} }
    ]
  },
  
  // Salary: Keep 3 years, archive older records
  salary: {
    retentionDays: 1095,
    collectionName: 'salary_archive',
    indexes: [
      { fields: { employee: 1, month: 1 }, options: { unique: true } },
      { fields: { month: 1 }, options: {} }
    ]
  },
  
  // SalesTarget: Keep 1 year, archive older records
  salesTarget: {
    retentionDays: 365,
    collectionName: 'sales_target_archive',
    indexes: [
      { fields: { employee: 1, date: 1 }, options: { unique: true } },
      { fields: { date: 1 }, options: {} }
    ]
  },
  
  // Message: Keep 6 months of resolved messages, archive older
  message: {
    retentionDays: 180,
    collectionName: 'message_archive',
    archiveIfResolved: true, // Only archive resolved messages
    indexes: [
      { fields: { from: 1, createdAt: -1 }, options: {} },
      { fields: { createdAt: -1 }, options: {} }
    ]
  }
};

/**
 * Ensure archive collections exist with indexes
 */
export const ensureArchiveCollections = async () => {
  try {
    const db = mongoose.connection;
    
    for (const [recordType, config] of Object.entries(ARCHIVE_CONFIG)) {
      const collectionName = config.collectionName;
      
      // Check if collection exists
      const collections = await db.db.listCollections().toArray();
      const collectionExists = collections.some(c => c.name === collectionName);
      
      if (!collectionExists) {
        // Create collection
        await db.createCollection(collectionName);
        console.log(`Created archive collection: ${collectionName}`);
      }
      
      // Create indexes
      const collection = db.collection(collectionName);
      for (const indexConfig of config.indexes) {
        try {
          await collection.createIndex(indexConfig.fields, indexConfig.options);
        } catch (error) {
          if (error.code !== 48) { // Ignore "index already exists" error
            console.error(`Failed to create index on ${collectionName}:`, error);
          }
        }
      }
    }
    
    console.log('Archive collections initialized');
  } catch (error) {
    console.error('Error ensuring archive collections:', error);
    throw error;
  }
};

/**
 * Archive old attendance records
 * @param {number} daysOld - Archive records older than this many days
 * @returns {Promise<Object>} Archival stats
 */
export const archiveAttendanceRecords = async (daysOld = ARCHIVE_CONFIG.attendance.retentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Find old records
    const oldRecords = await Attendance.find({ date: { $lt: cutoffDate } })
      .lean()
      .exec();
    
    if (oldRecords.length === 0) {
      return { archived: 0, deleted: 0, error: null };
    }
    
    // Archive to archive collection
    const db = mongoose.connection;
    const archiveCollection = db.collection(ARCHIVE_CONFIG.attendance.collectionName);
    
    if (oldRecords.length > 0) {
      await archiveCollection.insertMany(oldRecords);
      console.log(`Archived ${oldRecords.length} attendance records`);
    }
    
    // Delete from main collection
    const result = await Attendance.deleteMany({ date: { $lt: cutoffDate } });
    
    return {
      archived: oldRecords.length,
      deleted: result.deletedCount,
      error: null
    };
  } catch (error) {
    console.error('Error archiving attendance records:', error);
    return { archived: 0, deleted: 0, error: error.message };
  }
};

/**
 * Archive old fine records
 * @param {number} daysOld - Archive records older than this many days
 * @returns {Promise<Object>} Archival stats
 */
export const archiveFineRecords = async (daysOld = ARCHIVE_CONFIG.fine.retentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Only archive approved fines
    const query = {
      date: { $lt: cutoffDate },
      approved: true
    };
    
    const oldRecords = await Fine.find(query).lean().exec();
    
    if (oldRecords.length === 0) {
      return { archived: 0, deleted: 0, error: null };
    }
    
    // Archive
    const db = mongoose.connection;
    const archiveCollection = db.collection(ARCHIVE_CONFIG.fine.collectionName);
    
    await archiveCollection.insertMany(oldRecords);
    console.log(`Archived ${oldRecords.length} fine records`);
    
    // Delete from main collection
    const result = await Fine.deleteMany(query);
    
    return {
      archived: oldRecords.length,
      deleted: result.deletedCount,
      error: null
    };
  } catch (error) {
    console.error('Error archiving fine records:', error);
    return { archived: 0, deleted: 0, error: error.message };
  }
};

/**
 * Archive old salary records
 * @param {number} daysOld - Archive records older than this many days
 * @returns {Promise<Object>} Archival stats
 */
export const archiveSalaryRecords = async (daysOld = ARCHIVE_CONFIG.salary.retentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldRecords = await Salary.find({ month: { $lt: cutoffDate } })
      .lean()
      .exec();
    
    if (oldRecords.length === 0) {
      return { archived: 0, deleted: 0, error: null };
    }
    
    // Archive
    const db = mongoose.connection;
    const archiveCollection = db.collection(ARCHIVE_CONFIG.salary.collectionName);
    
    await archiveCollection.insertMany(oldRecords);
    console.log(`Archived ${oldRecords.length} salary records`);
    
    // Delete from main collection
    const result = await Salary.deleteMany({ month: { $lt: cutoffDate } });
    
    return {
      archived: oldRecords.length,
      deleted: result.deletedCount,
      error: null
    };
  } catch (error) {
    console.error('Error archiving salary records:', error);
    return { archived: 0, deleted: 0, error: error.message };
  }
};

/**
 * Archive old sales target records
 * @param {number} daysOld - Archive records older than this many days
 * @returns {Promise<Object>} Archival stats
 */
export const archiveSalesTargetRecords = async (daysOld = ARCHIVE_CONFIG.salesTarget.retentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldRecords = await SalesTarget.find({ date: { $lt: cutoffDate } })
      .lean()
      .exec();
    
    if (oldRecords.length === 0) {
      return { archived: 0, deleted: 0, error: null };
    }
    
    // Archive
    const db = mongoose.connection;
    const archiveCollection = db.collection(ARCHIVE_CONFIG.salesTarget.collectionName);
    
    await archiveCollection.insertMany(oldRecords);
    console.log(`Archived ${oldRecords.length} sales target records`);
    
    // Delete from main collection
    const result = await SalesTarget.deleteMany({ date: { $lt: cutoffDate } });
    
    return {
      archived: oldRecords.length,
      deleted: result.deletedCount,
      error: null
    };
  } catch (error) {
    console.error('Error archiving sales target records:', error);
    return { archived: 0, deleted: 0, error: error.message };
  }
};

/**
 * Archive old messages
 * @param {number} daysOld - Archive records older than this many days
 * @returns {Promise<Object>} Archival stats
 */
export const archiveMessageRecords = async (daysOld = ARCHIVE_CONFIG.message.retentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Only archive resolved messages
    const query = {
      createdAt: { $lt: cutoffDate },
      status: 'resolved'
    };
    
    const oldRecords = await Message.find(query).lean().exec();
    
    if (oldRecords.length === 0) {
      return { archived: 0, deleted: 0, error: null };
    }
    
    // Archive
    const db = mongoose.connection;
    const archiveCollection = db.collection(ARCHIVE_CONFIG.message.collectionName);
    
    await archiveCollection.insertMany(oldRecords);
    console.log(`Archived ${oldRecords.length} message records`);
    
    // Delete from main collection
    const result = await Message.deleteMany(query);
    
    return {
      archived: oldRecords.length,
      deleted: result.deletedCount,
      error: null
    };
  } catch (error) {
    console.error('Error archiving message records:', error);
    return { archived: 0, deleted: 0, error: error.message };
  }
};

/**
 * Run all archival operations
 * @returns {Promise<Object>} Summary of all archival operations
 */
export const runAllArchiveOperations = async () => {
  try {
    console.log('Starting archive operations...');
    
    const results = {
      timestamp: new Date(),
      attendance: await archiveAttendanceRecords(),
      fine: await archiveFineRecords(),
      salary: await archiveSalaryRecords(),
      salesTarget: await archiveSalesTargetRecords(),
      message: await archiveMessageRecords(),
    };
    
    // Calculate totals
    results.summary = {
      totalArchived: Object.values(results)
        .filter(r => typeof r === 'object' && r.archived)
        .reduce((sum, r) => sum + r.archived, 0),
      totalDeleted: Object.values(results)
        .filter(r => typeof r === 'object' && r.deleted)
        .reduce((sum, r) => sum + r.deleted, 0),
    };
    
    console.log('Archive operations completed:', results.summary);
    return results;
  } catch (error) {
    console.error('Error running archive operations:', error);
    throw error;
  }
};

/**
 * Get archived records count by type
 * @returns {Promise<Object>} Archive collection document counts
 */
export const getArchiveStats = async () => {
  try {
    const db = mongoose.connection;
    const stats = {};
    
    for (const [recordType, config] of Object.entries(ARCHIVE_CONFIG)) {
      try {
        const collection = db.collection(config.collectionName);
        const count = await collection.countDocuments();
        stats[recordType] = { count, collection: config.collectionName };
      } catch (error) {
        stats[recordType] = { count: 0, error: error.message };
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting archive stats:', error);
    throw error;
  }
};

export default {
  ARCHIVE_CONFIG,
  ensureArchiveCollections,
  archiveAttendanceRecords,
  archiveFineRecords,
  archiveSalaryRecords,
  archiveSalesTargetRecords,
  archiveMessageRecords,
  runAllArchiveOperations,
  getArchiveStats,
};
