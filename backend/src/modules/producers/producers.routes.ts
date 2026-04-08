import { Router } from 'express';
import { producersController } from './producers.controller';
import { authenticate, requireAdmin, requireFieldOrAbove } from '../../middleware/auth';

export const producersRoutes = Router();

producersRoutes.get('/map-data',        authenticate, producersController.getMapData.bind(producersController));
producersRoutes.get('/map',             authenticate, producersController.getAllForMap.bind(producersController));
producersRoutes.get('/',                authenticate, producersController.getAll.bind(producersController));
producersRoutes.get('/:id',             authenticate, producersController.getById.bind(producersController));
producersRoutes.get('/:id/score',       authenticate, producersController.getScore.bind(producersController));
producersRoutes.post('/',               authenticate, requireFieldOrAbove, producersController.create.bind(producersController));
producersRoutes.put('/:id',             authenticate, requireFieldOrAbove, producersController.update.bind(producersController));
producersRoutes.delete('/:id',          authenticate, requireAdmin, producersController.delete.bind(producersController));
producersRoutes.post('/:id/certifications', authenticate, requireFieldOrAbove, producersController.addCertification.bind(producersController));
