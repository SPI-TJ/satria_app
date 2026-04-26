"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const morgan_1 = __importDefault(require("morgan"));
const logger_1 = __importDefault(require("../utils/logger"));
// Custom morgan stream that pipes output to our Winston logger
const stream = {
    write: (message) => {
        // Remove the newline character from the end
        const cleanMessage = message.trim();
        if (cleanMessage) {
            logger_1.default.http(cleanMessage);
        }
    },
};
// Skip logs for health check endpoint
const skip = (req) => {
    return req.path === '/health';
};
// Morgan middleware configured to use Winston
const morganMiddleware = (0, morgan_1.default)(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms', { stream, skip });
exports.default = morganMiddleware;
//# sourceMappingURL=morgan.middleware.js.map