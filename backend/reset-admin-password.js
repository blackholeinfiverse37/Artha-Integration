import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import logger from './src/config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to database');

    const adminEmail = 'admin@artha.local';
    const newPassword = 'Admin@123456';

    // Find admin user
    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      logger.info('Creating new admin user...');
      admin = new User({
        email: adminEmail,
        name: 'System Administrator',
        role: 'admin',
        isActive: true
      });
    } else {
      logger.info('Admin user found, resetting password...');
    }

    // Set password (will be hashed by pre-save hook)
    admin.password = newPassword;
    admin.role = 'admin';
    admin.isActive = true;
    
    await admin.save();
    logger.info('✅ Admin password reset successfully');
    
    // Test the password
    const testUser = await User.findOne({ email: adminEmail }).select('+password');
    const isValid = await testUser.comparePassword(newPassword);
    
    logger.info('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');
    
    if (isValid) {
      logger.info('🎉 Admin login should now work with:');
      logger.info('Email: admin@artha.local');
      logger.info('Password: Admin@123456');
    }

  } catch (error) {
    logger.error('Error resetting admin password:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

resetAdminPassword();