import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import AgreementTemplate from '../models/AgreementTemplate.js';
import AgreementTemplateHistory from '../models/AgreementTemplateHistory.js';

// Load env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Migration script to move inactive agreement templates to history
 *
 * This script:
 * 1. Finds all templates where isActive is false
 * 2. Creates history records for them
 * 3. Deletes them from the main collection
 *
 * Run with: node src/scripts/migrateInactiveTemplates.js
 */
const migrateInactiveTemplates = async () => {
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

    // Find all inactive templates
    const inactiveTemplates = await AgreementTemplate.find({ isActive: false });
    console.log(`\nFound ${inactiveTemplates.length} inactive templates to migrate`);

    if (inactiveTemplates.length === 0) {
      console.log('No inactive templates found. Migration complete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Process each inactive template
    for (const template of inactiveTemplates) {
      try {
        // Check if already in history
        const existingHistory = await AgreementTemplateHistory.findOne({
          originalTemplateId: template._id
        });

        if (existingHistory) {
          console.log(`Template "${template.name}" (ID: ${template._id}) already in history, skipping...`);

          // Delete from main collection
          await AgreementTemplate.deleteOne({ _id: template._id });
          continue;
        }

        // Determine archive reason
        // Check if there's a newer version of the same type (version update)
        const newerVersion = await AgreementTemplate.findOne({
          type: template.type,
          version: { $gt: template.version },
          isActive: true
        });

        const archiveReason = newerVersion ? 'version_update' : 'deactivation';

        // Create history record
        await AgreementTemplateHistory.create({
          originalTemplateId: template._id,
          companyId: template.companyId,
          name: template.name,
          type: template.type,
          content: template.content,
          version: template.version,
          isRequired: template.isRequired,
          displayOrder: template.displayOrder,
          description: template.description,
          archiveReason: archiveReason,
          archivedBy: template.updatedBy || template.createdBy,
          createdBy: template.createdBy,
          originalCreatedAt: template.createdAt,
          originalUpdatedAt: template.updatedAt
        });

        // Delete from main collection
        await AgreementTemplate.deleteOne({ _id: template._id });

        console.log(`✓ Migrated: "${template.name}" (v${template.version}) - Reason: ${archiveReason}`);
        migratedCount++;
      } catch (error) {
        console.error(`✗ Error migrating template "${template.name}" (ID: ${template._id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total inactive templates found: ${inactiveTemplates.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify migration
    const remainingInactive = await AgreementTemplate.countDocuments({ isActive: false });
    const historyCount = await AgreementTemplateHistory.countDocuments();

    console.log('\n--- Verification ---');
    console.log(`Remaining inactive templates in main collection: ${remainingInactive}`);
    console.log(`Total records in history: ${historyCount}`);

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
migrateInactiveTemplates();