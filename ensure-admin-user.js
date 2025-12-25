import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User schema (simplified)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'viewer' },
  name: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function ensureAdminUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@artha.local';
    const adminPassword = 'Admin@123456';

    // Check if admin exists
    let admin = await User.findOne({ email: adminEmail });
    
    if (admin) {
      console.log('👤 Admin user found, updating password...');
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Update admin
      admin.password = hashedPassword;
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
      
      console.log('✅ Admin user updated successfully');
    } else {
      console.log('👤 Creating new admin user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Create admin
      admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        name: 'System Administrator',
        isActive: true
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully');
    }

    // Test password verification
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    console.log('🔐 Password verification test:', isValidPassword ? '✅ PASS' : '❌ FAIL');

    // List all users
    const users = await User.find({}, 'email role isActive');
    console.log('\n📋 Current users in database:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) ${user.isActive ? '✅' : '❌'}`);
    });

    console.log('\n🎉 Admin setup complete!');
    console.log('Login credentials: admin@artha.local / Admin@123456');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

ensureAdminUser();