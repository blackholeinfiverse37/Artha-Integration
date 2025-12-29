import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './config/logger.js';
import healthService from './services/health.service.js';
import { validateEnvironment } from './config/validation.js';
import {
  helmetConfig,
  limiter,
  sanitizeInput,
  watermark,
} from './middleware/security.js';
import {
  requestLogger,
  performanceMonitor,
  errorTracker,
} from './middleware/monitoring.js';
import { memoryMonitor } from './middleware/performance.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import accountsRoutes from './routes/accounts.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import insightflowRoutes from './routes/insightflow.routes.js';
import gstRoutes from './routes/gst.routes.js';
import tdsRoutes from './routes/tds.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import performanceRoutes from './routes/performance.routes.js';
import databaseRoutes from './routes/database.routes.js';
import healthRoutes from './routes/health.routes.js';
import bhivRoutes from './routes/bhiv.routes.js';
import legacyRoutes from './routes/index.js';

// Models for app registration
import IdempotencyRecord from './models/IdempotencyRecord.js';

// Load env vars
dotenv.config();

// Validate environment configuration
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

// Connect to database
connectDB();

// Connect to Redis with consistent error handling
const connectRedisWithFallback = async () => {
  try {
    await connectRedis();
    logger.info('Redis connected successfully');
  } catch (err) {
    logger.warn('Redis connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Running without Redis caching in production - performance may be impacted');
    } else {
      logger.info('Redis unavailable in development - continuing without cache');
    }
  }
};

connectRedisWithFallback();

// Initialize express
const app = express();

// Register models in app for middleware access
app.set('IdempotencyRecord', IdempotencyRecord);

// Security middleware
app.use(helmetConfig);

// Dynamic CORS configuration for network access
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and network IPs
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // Allow any origin that matches the pattern http://[IP]:5173
    const networkPattern = /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/;
    const isNetworkOrigin = networkPattern.test(origin);
    
    if (allowedOrigins.includes(origin) || isNetworkOrigin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(limiter);
app.use(watermark);

// Monitoring middleware (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
  app.use(performanceMonitor);
  
  // Start memory monitoring
  memoryMonitor();
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize inputs
app.use(sanitizeInput);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Mount health routes (before other routes for priority)
app.use('/api', healthRoutes);

// Enhanced health check (now handled by health routes)
// Legacy health endpoint for backward compatibility
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthService.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      message: `ARTHA API is ${health.status}`,
      data: health,
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
});

// Mount routes - V1 API (Primary)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/insightflow', insightflowRoutes);
app.use('/api/v1/gst', gstRoutes);
app.use('/api/v1/tds', tdsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/performance', performanceRoutes);
app.use('/api/v1/database', databaseRoutes);
app.use('/api/v1/bhiv', bhivRoutes);

// Legacy routes (Backward compatibility)
app.use('/api', legacyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error tracking middleware
app.use(errorTracker);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server (only if not in test mode)
let server;
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces
  server = app.listen(PORT, HOST, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
    logger.info(`Network access: http://[YOUR_IP]:${PORT}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;