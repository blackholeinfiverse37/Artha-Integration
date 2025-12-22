import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JournalEntry from '../src/models/JournalEntry.js';
import logger from '../src/config/logger.js';

dotenv.config();

/**
 * Migration script to update existing journal entries with enhanced hash-chain fields
 */
async function migrateHashChain() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get all posted entries sorted by creation date
    const entries = await JournalEntry.find({ status: 'posted' }).sort({ createdAt: 1 });

    logger.info(`Found ${entries.length} posted entries to migrate`);

    let prevHash = '0';
    let position = 0;

    // Process entries in batches for better performance
    const BATCH_SIZE = 100;
    const bulkOps = [];
    
    for (const entry of entries) {
      try {
        // Set chain position
        entry.chainPosition = position;
        
        // Set prevHash (use existing prev_hash if available)
        entry.prevHash = entry.prev_hash || prevHash;
        
        // Compute and set hash
        const computedHash = JournalEntry.computeHash(entry.toObject(), entry.prevHash);
        entry.hash = computedHash;
        
        // Update legacy fields for backward compatibility
        entry.prev_hash = entry.prevHash;
        entry.immutable_hash = entry.hash;
        entry.immutable_chain_valid = true;
        entry.hashTimestamp = entry.postedAt || entry.createdAt;

        // Compute immutable hash for posted entries (Spec v1)
        const immutableHash = entry.status === 'posted' ? 
          JournalEntry.prototype.computeImmutableHash.call(entry) : entry.hash;

        // Add to bulk operations
        bulkOps.push({
          updateOne: {
            filter: { _id: entry._id },
            update: {
              $set: {
                chainPosition: entry.chainPosition,
                prevHash: entry.prevHash,
                hash: entry.hash,
                prev_hash: entry.prevHash,
                immutable_hash: immutableHash || entry.hash,
                immutable_chain_valid: true,
                hashTimestamp: entry.hashTimestamp,
                // Ensure voidedAt is set for voided entries
                ...(entry.status === 'voided' && !entry.voidedAt && {
                  voidedAt: entry.updatedAt || entry.createdAt
                })
              }
            }
          }
        });

        prevHash = entry.hash;
        position++;

        // Execute batch when size reached
        if (bulkOps.length >= BATCH_SIZE) {
          await JournalEntry.bulkWrite(bulkOps);
          logger.info(`Processed batch of ${bulkOps.length} entries`);
          bulkOps.length = 0; // Clear array
        }
      } catch (error) {
        logger.error(`Failed to migrate entry ${entry.entryNumber}:`, error);
        // Continue with next entry
      }
    }

    // Process remaining entries
    if (bulkOps.length > 0) {
      await JournalEntry.bulkWrite(bulkOps);
      logger.info(`Processed final batch of ${bulkOps.length} entries`);
    }

    // Verify the chain after migration using static method
    logger.info('Verifying migrated chain using static method...');
    
    const verificationResult = await JournalEntry.verifyLedgerChain();
    
    if (verificationResult.isValid) {
      logger.info('✅ Chain verification successful! All entries are valid.', {
        totalEntries: verificationResult.totalEntries,
        lastHash: verificationResult.lastHash,
        timestamp: verificationResult.timestamp
      });
    } else {
      logger.error('❌ Chain verification failed:', {
        totalEntries: verificationResult.totalEntries,
        errorCount: verificationResult.errors.length
      });
      verificationResult.errors.forEach(err => logger.error(JSON.stringify(err)));
    }

    logger.info(`Migration completed: ${entries.length} entries processed`);
    
    // Update draft entries with chainPosition (using separate position counter for clarity)
    const draftEntries = await JournalEntry.find({ status: 'draft' });
    let draftPosition = position; // Explicit variable for draft entries
    const draftBulkOps = [];
    
    for (const entry of draftEntries) {
      try {
        draftBulkOps.push({
          updateOne: {
            filter: { _id: entry._id },
            update: {
              $set: {
                chainPosition: draftPosition,
                prevHash: prevHash,
                prev_hash: prevHash,
              }
            }
          }
        });
        
        draftPosition++;
      } catch (error) {
        logger.error(`Failed to update draft entry ${entry.entryNumber}:`, error);
        // Continue with next entry
      }
    }
    
    // Bulk update draft entries
    if (draftBulkOps.length > 0) {
      await JournalEntry.bulkWrite(draftBulkOps);
    }
    
    logger.info(`Updated ${draftEntries.length} draft entries`);

  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run migration
migrateHashChain()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
