import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import AgreementSignature from '../models/AgreementSignature.js';
import AgreementTemplateHistory from '../models/AgreementTemplateHistory.js';
import AgreementTemplate from '../models/AgreementTemplate.js';

// Load env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Migration script to populate contentSnapshot for existing signatures
 *
 * This script finds signatures without contentSnapshot and populates them
 * by matching the template ID and version from the history table.
 *
 * Run with: node src/scripts/migrateSignatureContent.js
 */
const migrateSignatureContent = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI or MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all signatures without contentSnapshot
    const signaturesWithoutContent = await AgreementSignature.find({
      $or: [
        { contentSnapshot: { $exists: false } },
        { contentSnapshot: null },
        { contentSnapshot: '' }
      ]
    });

    console.log(`\nFound ${signaturesWithoutContent.length} signatures without contentSnapshot`);

    if (signaturesWithoutContent.length === 0) {
      console.log('All signatures already have contentSnapshot. Migration complete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let migratedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const signature of signaturesWithoutContent) {
      try {
        // First, try to find in history by template ID and version
        let historyRecord = await AgreementTemplateHistory.findOne({
          originalTemplateId: signature.agreementTemplateId,
          version: signature.version
        });

        // If not found in history, try to find in current templates (for latest versions)
        if (!historyRecord) {
          const currentTemplate = await AgreementTemplate.findOne({
            _id: signature.agreementTemplateId,
            version: signature.version
          });

          if (currentTemplate) {
            // Use current template content for signatures of current version
            signature.contentSnapshot = currentTemplate.content;
            await signature.save();
            migratedCount++;
            console.log(`✓ Migrated (current): Template ${signature.agreementTemplateId}, Version ${signature.version}`);
            continue;
          }
        }

        if (historyRecord) {
          signature.contentSnapshot = historyRecord.content;
          await signature.save();
          migratedCount++;
          console.log(`✓ Migrated (history): Template ${signature.agreementTemplateId}, Version ${signature.version}`);
        } else {
          // Try to find any version of this template in history
          const anyHistoryRecord = await AgreementTemplateHistory.findOne({
            originalTemplateId: signature.agreementTemplateId
          }).sort({ version: -1 });

          if (anyHistoryRecord) {
            // Use the closest version we can find
            signature.contentSnapshot = anyHistoryRecord.content;
            await signature.save();
            migratedCount++;
            console.log(`⚠ Migrated (fallback): Template ${signature.agreementTemplateId}, Version ${signature.version} → using version ${anyHistoryRecord.version} content`);
          } else {
            notFoundCount++;
            console.log(`✗ Not found: Template ${signature.agreementTemplateId}, Version ${signature.version}`);
          }
        }
      } catch (error) {
        console.error(`✗ Error migrating signature ${signature._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total signatures without contentSnapshot: ${signaturesWithoutContent.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Content not found: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify migration
    const remainingWithoutContent = await AgreementSignature.countDocuments({
      $or: [
        { contentSnapshot: { $exists: false } },
        { contentSnapshot: null },
        { contentSnapshot: '' }
      ]
    });

    console.log('\n--- Verification ---');
    console.log(`Remaining signatures without contentSnapshot: ${remainingWithoutContent}`);

    await mongoose.disconnect();
    console.log('\nMigration complete. Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateSignatureContent();