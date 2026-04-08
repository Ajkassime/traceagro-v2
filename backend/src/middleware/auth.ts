import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Token d\'authentification manquant', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'Utilisateur non trouvé ou désactivé', 401);
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  } catch (error) {
    return sendError(res, 'Token invalide ou expiré', 401);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Non authentifié', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Accès refusé - permissions insuffisantes', 403);
    }
    return next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireAdminOrManager = requireRole('admin', 'quality_manager');
export const requireFieldOrAbove = requireRole('admin', 'quality_manager', 'field_agent');
