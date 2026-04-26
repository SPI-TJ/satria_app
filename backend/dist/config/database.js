"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'satria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // search_path agar tidak perlu tulis schema di setiap query
    options: '-c search_path=auth,master,pkpt,penugasan,audit,pelaporan,public',
});
exports.pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});
async function query(text, params) {
    const start = Date.now();
    const res = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log('[DB]', { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
}
//# sourceMappingURL=database.js.map