require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_tracker';

const seedStaff = async () => {
  console.log('[Seed] Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Seed] Connected to MongoDB.');

    const staffEmail = 'staff@college.edu';
    const staffPassword = 'Staff@123';
    const staffName = 'College Staff Admin';

    let staff = await User.findOne({ email: staffEmail });

    if (staff) {
      console.log(`[Seed] Staff user '${staffEmail}' already exists. Updating credentials...`);
      staff.name = staffName;
      staff.role = 'staff';
      staff.password = staffPassword; // Pre-save hook will hash this
      await staff.save();
      console.log(`[Seed] Staff user '${staffEmail}' updated successfully.`);
    } else {
      console.log(`[Seed] Creating new staff user '${staffEmail}'...`);
      staff = new User({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: 'staff',
        studentId: 'STAFF-01',
      });
      await staff.save();
      console.log(`[Seed] Staff user '${staffEmail}' created successfully.`);
    }

    console.log('[Seed] Credentials:');
    console.log(`       Email:    ${staffEmail}`);
    console.log(`       Password: ${staffPassword}`);
    console.log(`       Role:     staff`);

    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB. Seed complete.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error seeding staff user: ${error.message}`);
    process.exit(1);
  }
};

seedStaff();
