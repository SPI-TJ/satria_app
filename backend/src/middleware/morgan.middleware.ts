import morgan from 'morgan';
import logger from '../utils/logger';

// Custom morgan stream that pipes output to our Winston logger
const stream = {
  write: (message: string) => {
    // Remove the newline character from the end
    const cleanMessage = message.trim();
    if (cleanMessage) {
      logger.http(cleanMessage);
    }
  },
};

// Skip logs for health check endpoint
const skip = (req: any) => {
  return req.path === '/health';
};

// Morgan middleware configured to use Winston
const morganMiddleware = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  { stream, skip },
);

export default morganMiddleware;
