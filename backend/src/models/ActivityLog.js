import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Company the user belongs to
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },

    // Type of action performed
    action: {
      type: String,
      required: true,
      enum: [
        // Team actions
        'team_member_added',
        'team_member_updated',
        'team_member_deleted',
        'team_member_activated',
        'team_member_deactivated',
        'team_invite_resent',

        // Property actions
        'property_created',
        'property_updated',
        'property_deleted',
        'property_status_changed',
        'property_published',
        'property_unpublished',

        // Partner actions
        'partner_status_approved',
        'partner_status_rejected',
        'partner_status_suspended',
        'partner_status_activated',
        'partner_tier_changed',
        'partner_kyc_approved',
        'partner_kyc_rejected',

        // Commission actions
        'commission_created',
        'commission_updated',
        'commission_approved',
        'commission_paid',
        'commission_cancelled',

        // Agreement actions
        'agreement_created',
        'agreement_signed',
        'agreement_expired',

        // Visit actions
        'visit_scheduled',
        'visit_rescheduled',
        'visit_confirmed',
        'visit_completed',
        'visit_cancelled',

        // Settings actions
        'settings_updated',
        'company_profile_updated',

        // Auth actions
        'login_success',
        'login_failed',
        'password_changed',
        'profile_updated'
      ]
    },

    // Resource type that was affected
    resourceType: {
      type: String,
      required: true,
      enum: [
        'user',
        'team_member',
        'property',
        'partner',
        'commission',
        'agreement',
        'visit',
        'company',
        'settings',
        'auth'
      ]
    },

    // ID of the affected resource
    resourceId: {
      type: mongoose.Schema.Types.ObjectId
    },

    // Human-readable title for the resource
    resourceTitle: {
      type: String
    },

    // Additional details about the action
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // IP address of the user
    ipAddress: {
      type: String
    },

    // User agent string
    userAgent: {
      type: String
    },

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    collection: 'activity_logs'
  }
);

// Indexes for efficient querying
activityLogSchema.index({ companyId: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ resourceType: 1, timestamp: -1 });
activityLogSchema.index({ resourceId: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;