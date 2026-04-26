import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '../types';
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string;
//# sourceMappingURL=auth.middleware.d.ts.map