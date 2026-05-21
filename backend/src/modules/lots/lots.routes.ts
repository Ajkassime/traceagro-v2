import { Router } from 'express';
import { lotsController } from './lots.controller';
import { authenticate, requireFieldOrAbove, requireAdminOrManager } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createLotSchema,
  updateLotSchema,
  addStepSchema,
  upsertReceptionSchema,
  upsertPhaseSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  upsertStockEntrySchema,
} from './lots.schema';

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

// ── Réception ────────────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/reception',  authenticate, lotsController.getReception.bind(lotsController));
lotsRoutes.put ('/:id/reception',  authenticate, requireFieldOrAbove, validate(upsertReceptionSchema), lotsController.upsertReception.bind(lotsController));

// ── Workflow phases ───────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/workflow',   authenticate, lotsController.getWorkflow.bind(lotsController));
lotsRoutes.put ('/:id/workflow/phases/:vanillaType/:phaseType/:index', authenticate, requireFieldOrAbove, validate(upsertPhaseSchema), lotsController.upsertPhase.bind(lotsController));
lotsRoutes.post('/:id/workflow/phases/:phaseId/team',                  authenticate, requireFieldOrAbove, validate(addTeamMemberSchema), lotsController.addTeamMember.bind(lotsController));
lotsRoutes.put ('/:id/workflow/phases/:phaseId/team/:memberId',        authenticate, requireFieldOrAbove, validate(updateTeamMemberSchema), lotsController.updateTeamMember.bind(lotsController));
lotsRoutes.delete('/:id/workflow/phases/:phaseId/team/:memberId',      authenticate, requireFieldOrAbove, lotsController.deleteTeamMember.bind(lotsController));

// ── Entrée stock ──────────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/stock-entry', authenticate, lotsController.getStockEntry.bind(lotsController));
lotsRoutes.put ('/:id/stock-entry', authenticate, requireFieldOrAbove, validate(upsertStockEntrySchema), lotsController.upsertStockEntry.bind(lotsController));
