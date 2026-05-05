import mongoose from 'mongoose';
import User from './src/models/User.js';
import 'dotenv/config';

const update = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Update testpartner2 to active
  const result = await User.findOneAndUpdate(
    { email: 'testpartner2@example.com' },
    { 'partnerProfile.status': 'active' },
    { new: true }
  );
  
  if (result) {
    console.log('Updated partner:', result.email, '- status:', result.partnerProfile?.status);
  } else {
    console.log('Partner not found');
  }
  
  await mongoose.disconnect();
};

update();
