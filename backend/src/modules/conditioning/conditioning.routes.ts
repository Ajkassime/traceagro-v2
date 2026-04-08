import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './conditioning.controller';

export const conditioningRoutes = Router();

conditioningRoutes.use(authenticate);

conditioningRoutes.get('/norms',                          ctrl.getNorms);
conditioningRoutes.get('/steps-templates',                ctrl.getStepTemplates);
conditioningRoutes.get('/',                               ctrl.getOrders);
conditioningRoutes.get('/:id',                            ctrl.getOrder);
conditioningRoutes.post('/',                              ctrl.createOrder);
conditioningRoutes.put('/:id/steps/:stepId',              ctrl.updateStep);
conditioningRoutes.post('/:id/steps/:stepId/validate',    ctrl.validateStep);
