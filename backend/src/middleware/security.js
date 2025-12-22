import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import { validateJWTConfig, validateRedisConfig } from '../config/validation.js';

// Helmet configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Validate security configuration on load
if (process.env.NODE_ENV === 'production') {
  try {
    validateJWTConfig();
    validateRedisConfig();
  } catch (error) {
    logger.error('Security configuration validation failed:', error.message);
  }
}

// Rate limiting
export const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: 'Too many authentication attempts, please try again later',
});

// Legacy exports for backward compatibility
export const apiLimiter = limiter;

// Input validation helper
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Sanitize input (remove potential XSS)
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
        // Remove potential script tags
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// Audit logger middleware
export const auditLogger = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = data?.data?._id || data?.data?.id || req.params?.id || 'unknown';
        
        AuditLog.create({
          action,
          entityType,
          entityId: String(entityId),
          userId: req.user?._id,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          changes: req.body,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        }).catch(err => logger.error('Audit log error:', err));
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Watermark middleware (adds traceable header)
export const watermark = (req, res, next) => {
  const watermarkId = `ARTHA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Artha-Trace-Id', watermarkId);
  req.traceId = watermarkId;
  next();
};