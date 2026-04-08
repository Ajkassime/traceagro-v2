import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('❌ Error:', err);

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Un enregistrement avec ces données existe déjà',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Enregistrement introuvable',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Erreur interne du serveur'
    : err.message || 'Erreur interne du serveur';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
