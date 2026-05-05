import mongoose from 'mongoose';
import User from './src/models/User.js';
import 'dotenv/config';

const approve = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const partner = await User.findOne({ email: 'testpartner@example.com' });
  if (partner) {
    partner.partnerProfile.status = 'active';
    partner.isActive = true;
    partner.isEmailVerified = true;
    await partner.save();
    console.log('Partner approved:', partner.email);
    console.log('Status:', partner.partnerProfile.status);
  } else {
    console.log('Partner not found');
  }
  
  await mongoose.disconnect();
};

approve();
