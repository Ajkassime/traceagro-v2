import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, 'Connexion réussie');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400);
    }
  }

  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body);
      return sendSuccess(res, user, 'Compte créé avec succès', 201);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return sendError(res, 'Refresh token manquant', 400);
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess(res, result, 'Token renouvelé');
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 401);
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await authService.getMe(req.user!.id);
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message, err.statusCode || 400);
    }
  }
}

export const authController = new AuthController();
