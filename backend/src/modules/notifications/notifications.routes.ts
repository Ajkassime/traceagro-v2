import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth';

export const notificationsRoutes = Router();

notificationsRoutes.use(authenticate);
notificationsRoutes.get('/', notificationsController.getAll.bind(notificationsController));
notificationsRoutes.get('/unread-count', notificationsController.getUnreadCount.bind(notificationsController));
notificationsRoutes.patch('/:id/read', notificationsController.markAsRead.bind(notificationsController));
notificationsRoutes.patch('/mark-all-read', notificationsController.markAllAsRead.bind(notificationsController));
notificationsRoutes.delete('/:id', notificationsController.delete.bind(notificationsController));
