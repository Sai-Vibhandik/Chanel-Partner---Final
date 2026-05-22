import mongoose from 'mongoose';

const legalPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    enum: ['privacy-policy', 'terms-of-service', 'cookie-policy'],
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Update lastUpdated before saving
legalPageSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

const LegalPage = mongoose.model('LegalPage', legalPageSchema);
export default LegalPage;