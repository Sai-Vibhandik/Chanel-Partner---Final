import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema(
  {
    // User reference (null for failed attempts with unknown email)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Company for filtering (from user's company)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },

    // Email used in login attempt
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    // Login status
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true
    },

    // Device Information
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
      },
      brand: String,
      model: String
    },

    // Operating System
    os: {
      name: String,
      version: String
    },

    // Browser Information
    browser: {
      name: String,
      version: String
    },

    // Network Information
    ip: {
      type: String,
      required: true
    },

    // Geolocation (from IP)
    location: {
      country: String,
      countryCode: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      timezone: String
    },

    // Authentication Details
    loginMethod: {
      type: String,
      enum: ['password', 'google', 'reset_password'],
      default: 'password'
    },

    // Failure reason (if status is 'failed')
    failureReason: {
      type: String,
      enum: [
        'invalid_password',
        'user_not_found',
        'account_inactive',
        'account_suspended',
        'email_not_verified',
        'too_many_attempts',
        'unknown'
      ]
    },

    // User agent string (raw)
    userAgent: String,

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false // We use our own timestamp field
  }
);

// Indexes for efficient querying
loginLogSchema.index({ companyId: 1, timestamp: -1 });
loginLogSchema.index({ userId: 1, timestamp: -1 });
loginLogSchema.index({ email: 1, timestamp: -1 });
loginLogSchema.index({ status: 1, timestamp: -1 });
loginLogSchema.index({ 'location.country': 1 });
loginLogSchema.index({ 'location.city': 1 });

const LoginLog = mongoose.model('LoginLog', loginLogSchema);
export default LoginLog;