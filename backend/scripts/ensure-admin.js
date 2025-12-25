#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import logger from '../src/config/logger.js';

dotenv.config();

const ensureAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Database connected');

    // Check if admin user exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@artha.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    
    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      // Create admin user
      admin = await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
      });
      logger.info(`✅ Admin user created: ${admin.email}`);
    } else {
      logger.info(`✅ Admin user already exists: ${admin.email}`);
    }

    // Check if accountant user exists
    let accountant = await User.findOne({ email: 'accountant@artha.local' });
    
    if (!accountant) {
      accountant = await User.create({
        email: 'accountant@artha.local',
        password: 'Accountant@123',
        name: 'Accountant User',
        role: 'accountant',
      });
      logger.info(`✅ Accountant user created: ${accountant.email}`);
    } else {
      logger.info(`✅ Accountant user already exists: ${accountant.email}`);
    }

    // Check if viewer user exists
    let viewer = await User.findOne({ email: 'user@example.com' });
    
    if (!viewer) {
      viewer = await User.create({
        email: 'user@example.com',
        password: 'testuser123',
        name: 'Test User',
        role: 'viewer',
      });
      logger.info(`✅ Viewer user created: ${viewer.email}`);
    } else {
      logger.info(`✅ Viewer user already exists: ${viewer.email}`);
    }

    logger.info('\n🔐 Login Credentials:');
    logger.info(`Admin: ${adminEmail} / ${adminPassword}`);
    logger.info('Accountant: accountant@artha.local / Accountant@123');
    logger.info('Viewer: user@example.com / testuser123');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error ensuring admin user:', error);
    process.exit(1);
  }
};

ensureAdminUser();