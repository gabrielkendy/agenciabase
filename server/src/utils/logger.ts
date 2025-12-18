import { pino } from 'pino';
import { config } from '../config/index.js';

const transport = config.nodeEnv === 'development' ? {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
} : undefined;

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport,
  base: {
    env: config.nodeEnv,
  },
});

export default logger;
