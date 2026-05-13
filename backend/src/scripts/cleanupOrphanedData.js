import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models
import User from '../models/User.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Visit from '../models/Visit.js';
import Commission from '../models/Commission.js';
import Notification from '../models/Notification.js';
import ChatMessage from '../models/ChatMessage.js';
import LoginLog from '../models/LoginLog.js';
import EmailLog from '../models/EmailLog.js';
import AgreementSignature from '../models/AgreementSignature.js';
import AgreementTemplate from '../models/AgreementTemplate.js';
import OfficeAvailability from '../models/OfficeAvailability.js';
import TimeSlot from '../models/TimeSlot.js';
import Property from '../models/Property.js';

const cleanupOrphanedData = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get all existing user IDs
    const existingUsers = await User.find({}, '_id').lean();
    const existingUserIds = new Set(existingUsers.map(u => u._id.toString()));
    console.log(`Found ${existingUserIds.size} existing users\n`);

    let totalDeleted = 0;

    // ==========================================
    // 1. Clean up PartnerCompany (partnerships)
    // ==========================================
    console.log('Cleaning up PartnerCompany...');
    const partnerCompanyResult = await PartnerCompany.deleteMany({
      $or: [
        { partnerId: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { 'kycDocuments.uploadedBy': { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } }
      ]
    });
    console.log(`  Deleted ${partnerCompanyResult.deletedCount} orphaned partnerships`);
    totalDeleted += partnerCompanyResult.deletedCount;

    // ==========================================
    // 2. Clean up Visits
    // ==========================================
    console.log('Cleaning up Visits...');
    const visitResult = await Visit.deleteMany({
      $or: [
        { partner: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { handledBy: { $exists: true, $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { 'dealDetails.closedBy': { $exists: true, $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } }
      ]
    });
    console.log(`  Deleted ${visitResult.deletedCount} orphaned visits`);
    totalDeleted += visitResult.deletedCount;

    // ==========================================
    // 3. Clean up Commissions
    // ==========================================
    console.log('Cleaning up Commissions...');
    const commissionResult = await Commission.deleteMany({
      $or: [
        { partner: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { createdBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { 'approval.approvedBy': { $exists: true, $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { 'payout.paidBy': { $exists: true, $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } }
      ]
    });
    console.log(`  Deleted ${commissionResult.deletedCount} orphaned commissions`);
    totalDeleted += commissionResult.deletedCount;

    // ==========================================
    // 4. Clean up Notifications
    // ==========================================
    console.log('Cleaning up Notifications...');
    const notificationResult = await Notification.deleteMany({
      recipientId: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${notificationResult.deletedCount} orphaned notifications`);
    totalDeleted += notificationResult.deletedCount;

    // ==========================================
    // 5. Clean up ChatMessages
    // ==========================================
    console.log('Cleaning up ChatMessages...');
    const chatResult = await ChatMessage.deleteMany({
      $or: [
        { sender: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
        { 'readBy.user': { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } }
      ]
    });
    console.log(`  Deleted ${chatResult.deletedCount} orphaned chat messages`);
    totalDeleted += chatResult.deletedCount;

    // ==========================================
    // 6. Clean up LoginLogs
    // ==========================================
    console.log('Cleaning up LoginLogs...');
    const loginLogResult = await LoginLog.deleteMany({
      userId: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${loginLogResult.deletedCount} orphaned login logs`);
    totalDeleted += loginLogResult.deletedCount;

    // ==========================================
    // 7. Clean up EmailLogs
    // ==========================================
    console.log('Cleaning up EmailLogs...');
    const emailLogResult = await EmailLog.deleteMany({
      'recipient.userId': { $exists: true, $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${emailLogResult.deletedCount} orphaned email logs`);
    totalDeleted += emailLogResult.deletedCount;

    // ==========================================
    // 8. Clean up AgreementSignatures
    // ==========================================
    console.log('Cleaning up AgreementSignatures...');
    const signatureResult = await AgreementSignature.deleteMany({
      signedBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${signatureResult.deletedCount} orphaned agreement signatures`);
    totalDeleted += signatureResult.deletedCount;

    // Also delete signatures for templates that don't exist
    const existingTemplateIds = await AgreementTemplate.find({}, '_id').lean();
    const templateIds = new Set(existingTemplateIds.map(t => t._id.toString()));
    const signatureOrphanResult = await AgreementSignature.deleteMany({
      agreementTemplateId: { $nin: [...templateIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${signatureOrphanResult.deletedCount} signatures for non-existent templates`);
    totalDeleted += signatureOrphanResult.deletedCount;

    // ==========================================
    // 9. Clean up OfficeAvailability
    // ==========================================
    console.log('Cleaning up OfficeAvailability...');
    const availabilityResult = await OfficeAvailability.deleteMany({
      createdBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${availabilityResult.deletedCount} orphaned office availabilities`);
    totalDeleted += availabilityResult.deletedCount;

    // ==========================================
    // 10. Clean up TimeSlots
    // ==========================================
    console.log('Cleaning up TimeSlots...');
    const timeSlotResult = await TimeSlot.deleteMany({
      createdBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`  Deleted ${timeSlotResult.deletedCount} orphaned time slots`);
    totalDeleted += timeSlotResult.deletedCount;

    // ==========================================
    // 11. Update Properties (remove soldBy references to deleted users)
    // ==========================================
    console.log('Updating Properties...');
    const propertyResult = await Property.updateMany(
      { soldBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
      { $unset: { soldBy: 1, commissionId: 1 } }
    );
    console.log(`  Updated ${propertyResult.modifiedCount} properties`);
    totalDeleted += propertyResult.modifiedCount;

    // ==========================================
    // 12. Clean up AgreementTemplates (update createdBy if user deleted)
    // ==========================================
    console.log('Updating AgreementTemplates...');
    const templateResult = await AgreementTemplate.updateMany(
      { createdBy: { $nin: [...existingUserIds].map(id => new mongoose.Types.ObjectId(id)) } },
      { $unset: { createdBy: 1 } }
    );
    console.log(`  Updated ${templateResult.modifiedCount} agreement templates`);

    // ==========================================
    // 13. Delete agreement templates with version > 1 (keep only version 1)
    // ==========================================
    console.log('Cleaning up AgreementTemplates (keeping only version 1)...');
    const templateDeleteResult = await AgreementTemplate.deleteMany({
      version: { $gt: 1 }
    });
    console.log(`  Deleted ${templateDeleteResult.deletedCount} agreement templates with version > 1`);
    totalDeleted += templateDeleteResult.deletedCount;

    // Reset version to 1 for any templates that might have higher versions
    const templateUpdateResult = await AgreementTemplate.updateMany(
      { version: { $ne: 1 } },
      { $set: { version: 1 } }
    );
    console.log(`  Reset ${templateUpdateResult.modifiedCount} templates to version 1`);

    console.log('\n==========================================');
    console.log(`Total records cleaned: ${totalDeleted}`);
    console.log('==========================================\n');

    console.log('Cleanup completed successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

// Run the cleanup
cleanupOrphanedData();