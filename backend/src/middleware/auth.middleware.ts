import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'satria_secret_key_change_in_production';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan.' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') } as any);
}
