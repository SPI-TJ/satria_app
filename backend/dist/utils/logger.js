"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
// Define custom colors for different log levels
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};
winston_1.default.addColors(colors);
// Define custom log format
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} | ${info.level} | ${info.message}`));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define transports
const transports = [
    // Console transport - all levels
    new winston_1.default.transports.Console(),
    // File transport - error logs only (daily rotation)
    new winston_daily_rotate_file_1.default({
        level: 'error',
        filename: path_1.default.join(__dirname, '../../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        format: winston_1.default.format.combine(winston_1.default.format.uncolorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.json()),
    }),
    // File transport - all logs (daily rotation)
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(__dirname, '../../logs/combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        format: winston_1.default.format.combine(winston_1.default.format.uncolorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.json()),
    }),
];
// Create the logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    levels,
    format,
    transports,
});
exports.default = logger;
//# sourceMappingURL=logger.js.map