/**
 * 统一日志：基于 Pino，按环境与 LOG_LEVEL 输出
 */
import pino from 'pino';
import { logLevel } from '../config';

const logger = pino({
  level: logLevel,
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } }
    : {}),
});

export default logger;
