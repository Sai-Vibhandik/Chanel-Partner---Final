import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import PartnerCompany from './src/models/PartnerCompany.js';
import User from './src/models/User.js';
import 'dotenv/config';

const setup = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Set password for partner
  const hashedPassword = await bcrypt.hash('Test@123456', 12);
  const partner = await User.findOneAndUpdate(
    { email: 'testpartner@example.com' },
    { password: hashedPassword, isEmailVerified: true },
    { new: true }
  );
  console.log('Updated partner:', partner?.email);

  // Create partnership
  const existing = await PartnerCompany.findOne({
    partnerId: partner._id,
    companyId: '69f1ae6387ad12bbf3a4ba27'
  });

  if (!existing) {
    const partnership = await PartnerCompany.create({
      partnerId: partner._id,
      companyId: '69f1ae6387ad12bbf3a4ba27',
      status: 'active',
      tier: 'gold'
    });
    console.log('Created partnership:', partnership._id);
  } else {
    console.log('Partnership already exists');
    // Update to active and gold
    existing.status = 'active';
    existing.tier = 'gold';
    await existing.save();
    console.log('Updated partnership to active/gold');
  }

  await mongoose.disconnect();
  console.log('Done!');
};

setup().catch(console.error);
