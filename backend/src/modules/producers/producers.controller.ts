import { Request, Response } from 'express';
import { producersService } from './producers.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';

export class ProducersController {
  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { producers, total } = await producersService.getAll(page, limit, req.query.search as string, req.query.region as string);
      return sendPaginated(res, producers, total, page, limit);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getAllForMap(_req: Request, res: Response) {
    try {
      const producers = await producersService.getAllForMap();
      return sendSuccess(res, producers);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // NEW: enriched map data
  async getMapData(_req: Request, res: Response) {
    try {
      const data = await producersService.getMapData();
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getById(req: Request, res: Response) {
    try {
      const producer = await producersService.getById(req.params.id);
      return sendSuccess(res, producer);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async create(req: Request, res: Response) {
    try {
      const producer = await producersService.create(req.body);
      return sendSuccess(res, producer, 'Producteur créé', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async update(req: Request, res: Response) {
    try {
      const producer = await producersService.update(req.params.id, req.body);
      return sendSuccess(res, producer, 'Producteur mis à jour');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async delete(req: Request, res: Response) {
    try {
      await producersService.delete(req.params.id);
      return sendSuccess(res, null, 'Producteur supprimé');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async addCertification(req: Request, res: Response) {
    try {
      const cert = await producersService.addCertification(req.params.id, req.body);
      return sendSuccess(res, cert, 'Certification ajoutée', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getScore(req: Request, res: Response) {
    try {
      const score = await producersService.computeProducerScore(req.params.id);
      return sendSuccess(res, score);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }
}

export const producersController = new ProducersController();
