import { Request, Response } from 'express';
export declare function getUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getUserStats(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getUserById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateModuleAccess(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resetUserPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function setUserPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function toggleUserActive(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=users.controller.d.ts.map