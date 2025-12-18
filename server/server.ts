import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './src/config/index.js';
import { corsMiddleware } from './src/middleware/cors.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './src/middleware/error.middleware.js';
import { logger } from './src/utils/logger.js';
import routes from './src/api/routes/index.js';
import { startWorkers, stopWorkers } from './src/workers/index.js';
import { initializeRedis, closeRedis, testRedisConnection } from './src/config/redis.js';

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// API routes
app.use('/api', routes);

// Legacy v1 routes (redirect to /api)
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Base Agency API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

// 404 handler
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop workers
    await stopWorkers();

    // Close Redis connection
    await closeRedis();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Test Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn('Redis connection failed - workers will not start');
    } else {
      // Start workers
      await startWorkers();
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info(`🔗 API URL: ${config.apiUrl}`);
      logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
