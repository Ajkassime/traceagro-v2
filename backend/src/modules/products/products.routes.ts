import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

export const productsRoutes = Router();

productsRoutes.get('/', authenticate, productsController.getAll.bind(productsController));
productsRoutes.get('/:id', authenticate, productsController.getById.bind(productsController));
productsRoutes.post('/', authenticate, requireAdmin, productsController.create.bind(productsController));
productsRoutes.put('/:id', authenticate, requireAdmin, productsController.update.bind(productsController));
productsRoutes.delete('/:id', authenticate, requireAdmin, productsController.delete.bind(productsController));
