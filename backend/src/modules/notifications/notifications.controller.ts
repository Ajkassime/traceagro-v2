import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class NotificationsController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifs = await notificationsService.getForUser(req.user!.id, unreadOnly);
      return sendSuccess(res, notifs);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const count = await notificationsService.getUnreadCount(req.user!.id);
      return sendSuccess(res, { count });
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      await notificationsService.markAsRead(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Notification marquée comme lue');
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      await notificationsService.markAllAsRead(req.user!.id);
      return sendSuccess(res, null, 'Toutes les notifications marquées comme lues');
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await notificationsService.delete(req.params.id, req.user!.id);
      return sendSuccess(res, null, 'Notification supprimée');
    } catch (err: any) { return sendError(res, err.message, 500); }
  }
}

export const notificationsController = new NotificationsController();
