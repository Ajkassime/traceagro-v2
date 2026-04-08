import { Router } from 'express';
import { shipmentsController } from './shipments.controller';
import { authenticate, requireFieldOrAbove, requireAdminOrManager } from '../../middleware/auth';

export const shipmentsRoutes = Router();

// ── Routes PUBLIQUES (sans auth) ──────────────────────────────────────────
shipmentsRoutes.get('/public/:id',          shipmentsController.getPublic.bind(shipmentsController));
shipmentsRoutes.post('/public/:id/scan',    shipmentsController.recordScan.bind(shipmentsController));

// ── Routes protégées ─────────────────────────────────────────────────────
shipmentsRoutes.use(authenticate);
shipmentsRoutes.get('/stats',               shipmentsController.getStats.bind(shipmentsController));
shipmentsRoutes.get('/',                    shipmentsController.getAll.bind(shipmentsController));
shipmentsRoutes.get('/:id',                 shipmentsController.getById.bind(shipmentsController));
shipmentsRoutes.post('/',         requireFieldOrAbove,    shipmentsController.create.bind(shipmentsController));
shipmentsRoutes.put('/:id',       requireAdminOrManager,  shipmentsController.update.bind(shipmentsController));
shipmentsRoutes.patch('/:id/status', requireFieldOrAbove, shipmentsController.updateStatus.bind(shipmentsController));
shipmentsRoutes.delete('/:id',    requireAdminOrManager,  shipmentsController.delete.bind(shipmentsController));
shipmentsRoutes.post('/:id/lots', requireFieldOrAbove,    shipmentsController.addLots.bind(shipmentsController));
shipmentsRoutes.delete('/:id/lots/:lotId', requireFieldOrAbove, shipmentsController.removeLot.bind(shipmentsController));
