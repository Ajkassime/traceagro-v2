import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './clients.controller';

export const clientsRoutes = Router();
clientsRoutes.use(authenticate);

clientsRoutes.get('/',        ctrl.getAll);
clientsRoutes.get('/:id',     ctrl.getById);
clientsRoutes.post('/',       ctrl.create);
clientsRoutes.put('/:id',     ctrl.update);
clientsRoutes.delete('/:id',  ctrl.remove);
