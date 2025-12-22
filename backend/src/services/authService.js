import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import securityConfig from '../config/security.js';
import logger from '../config/logger.js';

class AuthService {
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: securityConfig.jwt.expiresIn
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });
  }

  async register(userData) {
    const { name, email, password, role = 'viewer' } = userData;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = new User({ name, email, password, role });
    await user.save();

    const token = this.generateToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    logger.info(`New user registered: ${email}`);
    
    return { 
      user: { id: user._id, name: user.name, email: user.email, role: user.role }, 
      token,
      refreshToken,
      _id: user._id
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    
    const token = this.generateToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);
    
    user.refreshToken = refreshToken;
    await user.save();
    
    logger.info(`User logged in: ${email}`);
    
    return { 
      user: { id: user._id, name: user.name, email: user.email, role: user.role }, 
      token,
      refreshToken,
      _id: user._id
    };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    logger.info(`User logged out: ${userId}`);
    return { success: true, message: 'Logged out successfully' };
  }
}

export default new AuthService();