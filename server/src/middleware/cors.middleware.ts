import cors from 'cors';
import { config } from '../config/index.js';

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://base-agency-saas.vercel.app',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (como mobile apps ou curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Organization-ID',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
});

export default corsMiddleware;
