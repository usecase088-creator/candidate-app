import winston from 'winston';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, splat } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    logFormat
  ),
  transports: [
    // ALWAYS log to console. Modern cloud providers (like Render, Heroku, AWS)
    // strictly require logs to go to stdout to appear in their dashboards.
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        splat(),
        logFormat
      ),
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  fs.mkdirSync('logs', { recursive: true });
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export default logger;
