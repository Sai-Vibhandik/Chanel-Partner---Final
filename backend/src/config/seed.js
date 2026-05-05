import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Company from '../models/Company.js';

// Load environment variables
dotenv.config();

/**
 * Seed database with initial data
 */
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if platform admin already exists
    const existingAdmin = await User.findOne({ role: 'platform_admin' });

    if (existingAdmin) {
      console.log('ℹ️ Platform admin already exists');
      console.log(`   Email: ${existingAdmin.email}`);
      return;
    }

    // Create platform admin
    const platformAdmin = await User.create({
      email: 'admin@platform.com',
      password: 'Admin@123456',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'platform_admin',
      isActive: true,
      isEmailVerified: true
    });

    console.log('✅ Platform admin created:');
    console.log(`   Email: ${platformAdmin.email}`);
    console.log(`   Password: Admin@123456`);
    console.log('   ⚠️ Please change the password after first login');

    // Create a demo company
    const demoCompany = await Company.create({
      name: 'ABC Developers',
      slug: 'abc-developers',
      email: 'info@abcdevelopers.com',
      phone: '+91 9876543210',
      website: 'https://abcdevelopers.com',
      regions: ['india'],
      defaultCurrency: 'INR',
      address: {
        street: '123 Business Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001'
      },
      status: 'active',
      subscription: {
        plan: 'professional',
        status: 'active'
      }
    });

    console.log('✅ Demo company created:');
    console.log(`   Name: ${demoCompany.name}`);

    // Create company superadmin for demo company
    const companyAdmin = await User.create({
      companyId: demoCompany._id,
      email: 'admin@abcdevelopers.com',
      password: 'Admin@123456',
      firstName: 'John',
      lastName: 'Doe',
      role: 'company_superadmin',
      isActive: true,
      isEmailVerified: true
    });

    console.log('✅ Company superadmin created:');
    console.log(`   Email: ${companyAdmin.email}`);
    console.log(`   Password: Admin@123456`);

    // Create demo partner
    const partner = await User.create({
      companyId: demoCompany._id,
      email: 'partner@example.com',
      password: 'Partner@123456',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'partner',
      isActive: true,
      isEmailVerified: true,
      partnerProfile: {
        companyName: 'XYZ Properties',
        companyType: 'proprietorship',
        operatingRegion: 'india',
        status: 'active',
        tier: 'gold'
      }
    });

    console.log('✅ Demo partner created:');
    console.log(`   Email: ${partner.email}`);
    console.log(`   Password: Partner@123456`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Platform Admin                                              │');
    console.log('│   Email: admin@platform.com                                 │');
    console.log('│   Password: Admin@123456                                    │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Company SuperAdmin                                          │');
    console.log('│   Email: admin@abcdevelopers.com                            │');
    console.log('│   Password: Admin@123456                                    │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Partner                                                      │');
    console.log('│   Email: partner@example.com                                 │');
    console.log('│   Password: Partner@123456                                  │');
    console.log('└─────────────────────────────────────────────────────────────┘');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run seed
seedDatabase();