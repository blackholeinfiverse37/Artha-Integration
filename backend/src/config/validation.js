import logger from './logger.js';

// Required environment variables for production
const REQUIRED_PROD_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'HMAC_SECRET',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'REDIS_PASSWORD',
  'FRONTEND_URL',
  'LOG_LEVEL',
];

// Validate environment configuration
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Check required variables
  REQUIRED_PROD_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (process.env[varName].includes('CHANGE_ME') || 
               process.env[varName].includes('YOUR_SUPER_SECRET') ||
               process.env[varName].length < 32) {
      errors.push(`Environment variable ${varName} appears to use default/weak value`);
    }
  });

  // Check recommended variables
  RECOMMENDED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Recommended environment variable not set: ${varName}`);
    }
  });

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ADMIN_PASSWORD === 'CHANGE_ME_IMMEDIATELY') {
      errors.push('Admin password must be changed from default value');
    }
    
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
      warnings.push('FRONTEND_URL should be set to production domain');
    }
  }

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    throw new Error('Environment validation failed. Check logs for details.');
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  logger.info('Environment validation passed');
  return true;
};

// Validate specific configuration sections
export const validateDatabaseConfig = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }
  
  // Check if URI contains credentials
  if (!process.env.MONGODB_URI.includes('@') && process.env.NODE_ENV === 'production') {
    logger.warn('MongoDB URI does not contain credentials - ensure authentication is configured');
  }
};

export const validateJWTConfig = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets are required');
  }
  
  if (jwtSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters long');
  }
  
  if (jwtSecret === refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
};

export const validateRedisConfig = () => {
  if (process.env.REDIS_HOST && !process.env.REDIS_PASSWORD) {
    logger.warn('Redis host configured but no password set - consider setting REDIS_PASSWORD');
  }
};

export default {
  validateEnvironment,
  validateDatabaseConfig,
  validateJWTConfig,
  validateRedisConfig,
};