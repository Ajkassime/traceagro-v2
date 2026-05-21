import { Request, Response } from 'express';
import { lotsService } from './lots.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';

export class LotsController {
  async getAll(req: Request, res: Response) {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { lots, total } = await lotsService.getAll(
        page, limit,
        req.query.search     as string,
        req.query.status     as string,
        req.query.productId  as string,
        req.query.producerId as string,
      );
      return sendPaginated(res, lots, total, page, limit);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getById(req: Request, res: Response) {
    try {
      const lot = await lotsService.getById(req.params.id);
      return sendSuccess(res, lot);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ── Page publique QR ─────────────────────────────────────────────────────
  async getPublic(req: Request, res: Response) {
    try {
      const lot = await lotsService.getPublic(req.params.id);
      return sendSuccess(res, lot);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ── Enregistrer un scan (avec détection anomalies) ──────────────────────
  async recordScan(req: Request, res: Response) {
    try {
      const lotId   = req.params.id;
      const ip      = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
      const ua      = req.headers['user-agent'] || '';
      const referer = req.headers['referer'] || '';
      const { country, city } = req.body ?? {};

      const log = await lotsService.recordScanWithCheck(lotId, {
        ipAddress: ip,
        userAgent: ua,
        referer,
        country: country || undefined,
        city:    city    || undefined,
      });
      return sendSuccess(res, { recorded: true, suspicious: log?.isSuspicious ?? false });
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ── Analytics des scans (admin) ──────────────────────────────────────────
  async getScanAnalytics(req: Request, res: Response) {
    try {
      const analytics = await lotsService.getScanAnalytics(req.params.id);
      return sendSuccess(res, analytics);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ── Rapport Anti-Contrefaçon complet ──────────────────────────────────────
  async getAntiFraudReport(req: Request, res: Response) {
    try {
      const report = await lotsService.getAntiFraudReport(req.params.id);
      return sendSuccess(res, report);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async create(req: Request, res: Response) {
    try {
      const lot = await lotsService.create(req.body);
      return sendSuccess(res, lot, 'Lot créé avec succès', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async update(req: Request, res: Response) {
    try {
      const lot = await lotsService.update(req.params.id, req.body);
      return sendSuccess(res, lot, 'Lot mis à jour');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async addStep(req: Request, res: Response) {
    try {
      const step = await lotsService.addStep(req.params.id, req.body);
      return sendSuccess(res, step, 'Étape ajoutée', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getDashboardStats(_req: Request, res: Response) {
    try {
      const stats = await lotsService.getDashboardStats();
      return sendSuccess(res, stats);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ─── RÉCEPTION ───────────────────────────────────────────────────────────────
  async getReception(req: Request, res: Response) {
    try {
      const data = await lotsService.getReception(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertReception(req: Request, res: Response) {
    try {
      const data = await lotsService.upsertReception(req.params.id, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ─── WORKFLOW ─────────────────────────────────────────────────────────────────
  async getWorkflow(req: Request, res: Response) {
    try {
      const data = await lotsService.getWorkflow(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertPhase(req: Request, res: Response) {
    try {
      const { id, vanillaType, phaseType, index } = req.params;
      const phaseIndex = parseInt(index, 10);
      if (isNaN(phaseIndex) || phaseIndex < 1) {
        return sendError(res, 'Index de phase invalide', 422);
      }
      const data = await lotsService.upsertPhase(id, vanillaType, phaseType, phaseIndex, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async addTeamMember(req: Request, res: Response) {
    try {
      const data = await lotsService.addTeamMember(req.params.id, req.params.phaseId, req.body);
      return sendSuccess(res, data, 'Membre ajouté', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async updateTeamMember(req: Request, res: Response) {
    try {
      const data = await lotsService.updateTeamMember(req.params.id, req.params.memberId, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async deleteTeamMember(req: Request, res: Response) {
    try {
      await lotsService.deleteTeamMember(req.params.id, req.params.memberId);
      return sendSuccess(res, null, 'Membre supprimé');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ─── STOCK ENTRY ─────────────────────────────────────────────────────────────
  async getStockEntry(req: Request, res: Response) {
    try {
      const data = await lotsService.getStockEntry(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertStockEntry(req: Request, res: Response) {
    try {
      const data = await lotsService.upsertStockEntry(req.params.id, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }
}

export const lotsController = new LotsController();
