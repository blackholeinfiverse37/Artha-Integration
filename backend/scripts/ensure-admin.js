import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import logger from '../src/config/logger.js';

dotenv.config();

const ensureAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Database connected');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@artha.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    // Check if admin user exists
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      // Create admin user
      admin = await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });
      logger.info(`✅ Admin user created: ${admin.email}`);
    } else {
      logger.info(`✅ Admin user already exists: ${admin.email}`);
      
      // Update password if needed (for development)
      if (process.env.NODE_ENV === 'development') {
        admin.password = adminPassword;
        await admin.save();
        logger.info('🔄 Admin password updated for development');
      }
    }

    // Ensure other demo users exist
    const users = [
      {
        email: 'accountant@artha.local',
        password: 'Accountant@123',
        name: 'Accountant User',
        role: 'accountant'
      },
      {
        email: 'user@example.com',
        password: 'testuser123',
        name: 'Test User',
        role: 'viewer'
      }
    ];

    for (const userData of users) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
        logger.info(`✅ User created: ${user.email}`);
      } else {
        logger.info(`✅ User already exists: ${user.email}`);
      }
    }

    logger.info('\n🎉 All demo users are ready!');
    logger.info('\nLogin credentials:');
    logger.info('👤 Admin: admin@artha.local / Admin@123456');
    logger.info('👤 Accountant: accountant@artha.local / Accountant@123');
    logger.info('👤 Viewer: user@example.com / testuser123');

    process.exit(0);
  } catch (error) {
    logger.error('Error ensuring admin user:', error);
    process.exit(1);
  }
};

ensureAdminUser();