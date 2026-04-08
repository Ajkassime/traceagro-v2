import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

export const usersRoutes = Router();

usersRoutes.use(authenticate);
usersRoutes.get('/', requireAdmin, usersController.getAll.bind(usersController));
usersRoutes.get('/:id', requireAdmin, usersController.getById.bind(usersController));
usersRoutes.put('/:id', requireAdmin, usersController.update.bind(usersController));
usersRoutes.patch('/:id/toggle-active', requireAdmin, usersController.toggleActive.bind(usersController));
usersRoutes.delete('/:id', requireAdmin, usersController.delete.bind(usersController));
