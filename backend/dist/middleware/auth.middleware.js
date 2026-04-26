"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'satria_secret_key_change_in_production';
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token tidak ditemukan.' });
    }
    try {
        const token = header.split(' ')[1];
        req.user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`,
            });
        }
        next();
    };
}
function generateToken(payload) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') });
}
//# sourceMappingURL=auth.middleware.js.map