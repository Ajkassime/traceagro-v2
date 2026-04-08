import { Router } from 'express';
import { lotsController } from './lots.controller';
import { authenticate, requireFieldOrAbove, requireAdminOrManager } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createLotSchema, updateLotSchema, addStepSchema } from './lots.schema';

export const lotsRoutes = Router();

// ── Routes publiques (sans auth) ─────────────────────────────────────────────
lotsRoutes.get ('/public/:id',        lotsController.getPublic.bind(lotsController));
lotsRoutes.post('/public/:id/scan',   lotsController.recordScan.bind(lotsController));

// ── Routes protégées ──────────────────────────────────────────────────────────
lotsRoutes.get ('/dashboard-stats',   authenticate, lotsController.getDashboardStats.bind(lotsController));
lotsRoutes.get ('/',                  authenticate, lotsController.getAll.bind(lotsController));
lotsRoutes.get ('/:id',               authenticate, lotsController.getById.bind(lotsController));
lotsRoutes.get ('/:id/scan-analytics',authenticate, lotsController.getScanAnalytics.bind(lotsController));
lotsRoutes.get ('/:id/antifraud',      authenticate, lotsController.getAntiFraudReport.bind(lotsController));
lotsRoutes.post('/',                  authenticate, requireFieldOrAbove, validate(createLotSchema), lotsController.create.bind(lotsController));
lotsRoutes.put ('/:id',               authenticate, requireAdminOrManager, validate(updateLotSchema), lotsController.update.bind(lotsController));
lotsRoutes.post('/:id/steps',         authenticate, requireFieldOrAbove,   validate(addStepSchema),   lotsController.addStep.bind(lotsController));
