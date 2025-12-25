import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  name: String,
  role: { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'viewer' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  refreshToken: String,
}, { timestamps: true });

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function debugAdminLogin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@artha.local';
    const testPassword = 'Admin@123456';

    console.log(`\n🔍 Looking for user: ${adminEmail}`);
    
    // Find user with password
    const user = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:');
    console.log('  - ID:', user._id);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Active:', user.isActive);
    console.log('  - Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'NO PASSWORD');
    
    if (!user.password) {
      console.log('❌ User has no password hash!');
      
      // Fix by setting password
      console.log('🔧 Setting password...');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(testPassword, salt);
      await user.save();
      console.log('✅ Password set successfully');
    }
    
    console.log(`\n🔐 Testing password comparison...`);
    console.log('Test password:', testPassword);
    
    // Test direct bcrypt comparison
    const directMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Direct bcrypt.compare result:', directMatch);
    
    // Test model method
    const modelMatch = await user.comparePassword(testPassword);
    console.log('Model comparePassword result:', modelMatch);
    
    // Test wrong password
    const wrongMatch = await user.comparePassword('wrongpassword');
    console.log('Wrong password test:', wrongMatch);
    
    if (directMatch && modelMatch) {
      console.log('\n🎉 Password verification working correctly!');
      console.log('Admin should be able to login with: admin@artha.local / Admin@123456');
    } else {
      console.log('\n❌ Password verification failed!');
      console.log('Need to investigate further...');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugAdminLogin();