import { Request, Response } from 'express';
import { shipmentsService } from './shipments.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';

export class ShipmentsController {
  async getAll(req: Request, res: Response) {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { shipments, total } = await shipmentsService.getAll(
        page, limit, req.query.status as string, req.query.search as string,
      );
      return sendPaginated(res, shipments, total, page, limit);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getById(req: Request, res: Response) {
    try {
      const shipment = await shipmentsService.getById(req.params.id);
      return sendSuccess(res, shipment);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ── Page publique QR expédition ──────────────────────────────────────────
  async getPublic(req: Request, res: Response) {
    try {
      const shipment = await shipmentsService.getPublic(req.params.id);
      return sendSuccess(res, shipment);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async create(req: Request, res: Response) {
    try {
      const shipment = await shipmentsService.create(req.body);
      return sendSuccess(res, shipment, 'Expédition créée', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async update(req: Request, res: Response) {
    try {
      const shipment = await shipmentsService.update(req.params.id, req.body);
      return sendSuccess(res, shipment, 'Expédition mise à jour');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const shipment = await shipmentsService.updateStatus(req.params.id, req.body.status);
      return sendSuccess(res, shipment, 'Statut mis à jour');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async delete(req: Request, res: Response) {
    try {
      await shipmentsService.delete(req.params.id);
      return sendSuccess(res, null, 'Expédition supprimée');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async addLots(req: Request, res: Response) {
    try {
      const { lotIds } = req.body;
      await shipmentsService.addLots(req.params.id, lotIds);
      return sendSuccess(res, null, 'Lots ajoutés à l\'expédition');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async removeLot(req: Request, res: Response) {
    try {
      await shipmentsService.removeLot(req.params.id, req.params.lotId);
      return sendSuccess(res, null, 'Lot retiré');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getStats(_req: Request, res: Response) {
    try {
      const stats = await shipmentsService.getStats();
      return sendSuccess(res, stats);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  // ── Enregistrer un scan QR expédition (public) ──────────────────────────
  async recordScan(req: Request, res: Response) {
    try {
      const ip        = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      const referer   = req.headers['referer'] || '';
      // Log simple (sans géolocalisation pour l'instant)
      console.log(`[QR SCAN] shipment=${req.params.id} ip=${ip} ua=${userAgent.slice(0, 80)}`);
      return sendSuccess(res, { recorded: true });
    } catch (err: any) { return sendError(res, err.message, 500); }
  }
}

export const shipmentsController = new ShipmentsController();
