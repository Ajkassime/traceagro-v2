import { Request, Response } from 'express';
import { productsService } from './products.service';
import { sendSuccess, sendError } from '../../utils/response';

export class ProductsController {
  async getAll(_req: Request, res: Response) {
    try {
      const products = await productsService.getAll();
      return sendSuccess(res, products);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async getById(req: Request, res: Response) {
    try {
      const product = await productsService.getById(req.params.id);
      return sendSuccess(res, product);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async create(req: Request, res: Response) {
    try {
      const product = await productsService.create(req.body);
      return sendSuccess(res, product, 'Produit créé', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async update(req: Request, res: Response) {
    try {
      const product = await productsService.update(req.params.id, req.body);
      return sendSuccess(res, product, 'Produit mis à jour');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async delete(req: Request, res: Response) {
    try {
      await productsService.delete(req.params.id);
      return sendSuccess(res, null, 'Produit supprimé');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }
}

export const productsController = new ProductsController();
