import { Request, Response } from 'express';
export declare function getNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function markAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function markAllAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteNotification(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notifications.controller.d.ts.map