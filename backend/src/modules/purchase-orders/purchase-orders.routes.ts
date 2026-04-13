import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './purchase-orders.controller';

export const purchaseOrdersRoutes = Router();
purchaseOrdersRoutes.use(authenticate);

purchaseOrdersRoutes.get('/',        ctrl.getAll);
purchaseOrdersRoutes.get('/:id',     ctrl.getById);
purchaseOrdersRoutes.post('/',       ctrl.create);
purchaseOrdersRoutes.put('/:id',     ctrl.update);
purchaseOrdersRoutes.delete('/:id',  ctrl.remove);
