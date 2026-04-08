import { Request, Response } from 'express';
import { documentsService } from './documents.service';
import { sendSuccess, sendError } from '../../utils/response';

export class DocumentsController {
  async getAll(req: Request, res: Response) {
    try {
      const docs = await documentsService.getAll(
        req.query.lotId      as string,
        req.query.producerId as string,
        req.query.shipmentId as string,
        req.query.docType    as string,
        req.query.search     as string,
      );
      return sendSuccess(res, docs);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async getById(req: Request, res: Response) {
    try {
      const doc = await documentsService.getById(req.params.id);
      return sendSuccess(res, doc);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await documentsService.getStats();
      return sendSuccess(res, stats);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async create(req: Request, res: Response) {
    try {
      const doc = await documentsService.create(req.body);
      return sendSuccess(res, doc, 'Document ajouté', 201);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async update(req: Request, res: Response) {
    try {
      const doc = await documentsService.update(req.params.id, req.body);
      return sendSuccess(res, doc, 'Document mis à jour');
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async delete(req: Request, res: Response) {
    try {
      await documentsService.delete(req.params.id);
      return sendSuccess(res, null, 'Document supprimé');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getExpiringCerts(req: Request, res: Response) {
    try {
      const days  = parseInt(req.query.days as string) || 60;
      const certs = await documentsService.getExpiringCertifications(days);
      return sendSuccess(res, certs);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }
}

export const documentsController = new DocumentsController();
