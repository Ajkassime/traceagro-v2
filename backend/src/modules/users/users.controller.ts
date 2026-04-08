import { Request, Response } from 'express';
import { usersService } from './users.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';

export class UsersController {
  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { users, total } = await usersService.getAll(page, limit);
      return sendPaginated(res, users, total, page, limit);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 500);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const user = await usersService.getById(req.params.id);
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 500);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const user = await usersService.update(req.params.id, req.body);
      return sendSuccess(res, user, 'Utilisateur mis à jour');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 500);
    }
  }

  async toggleActive(req: Request, res: Response) {
    try {
      const user = await usersService.toggleActive(req.params.id);
      return sendSuccess(res, user, 'Statut mis à jour');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 500);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await usersService.delete(req.params.id);
      return sendSuccess(res, null, 'Utilisateur supprimé');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 500);
    }
  }
}

export const usersController = new UsersController();
