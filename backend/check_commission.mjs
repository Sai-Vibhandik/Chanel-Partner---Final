import mongoose from 'mongoose';
import Property from './src/models/Property.js';
import Company from './src/models/Company.js';
import 'dotenv/config';

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Check property commission
  const property = await Property.findOne({ name: /Luxury Villa/i });
  console.log('Property Commission:', property?.commission);
  console.log('Property:', property?.name);
  
  // Check company tier percentages
  const company = await Company.findById(property?.companyId);
  console.log('\nCompany Tier Percentages:', company?.settings?.tierPercentages);
  
  await mongoose.disconnect();
};

check();
