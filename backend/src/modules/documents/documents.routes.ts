import { Router } from 'express';
import { documentsController } from './documents.controller';
import { authenticate, requireFieldOrAbove } from '../../middleware/auth';

export const documentsRoutes = Router();

// ── Routes protégées ─────────────────────────────────────────────────────
documentsRoutes.use(authenticate);
documentsRoutes.get('/stats',                   documentsController.getStats.bind(documentsController));
documentsRoutes.get('/expiring-certifications', documentsController.getExpiringCerts.bind(documentsController));
documentsRoutes.get('/',                        documentsController.getAll.bind(documentsController));
documentsRoutes.get('/:id',                     documentsController.getById.bind(documentsController));
documentsRoutes.post('/',     requireFieldOrAbove, documentsController.create.bind(documentsController));
documentsRoutes.put('/:id',   requireFieldOrAbove, documentsController.update.bind(documentsController));
documentsRoutes.delete('/:id', requireFieldOrAbove, documentsController.delete.bind(documentsController));
