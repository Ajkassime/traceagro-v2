import rateLimit from 'express-rate-limit';

// Rate limiter spécifique pour les tentatives de connexion (anti-brute force)
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  },
});

// Rate limiter spécifique pour le renouvellement de tokens
export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes de rafraîchissement. Veuillez réessayer plus tard.',
  },
});

// Rate limiter spécifique pour l'enregistrement d'utilisateurs
export const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes de création d\'utilisateur. Veuillez patienter.',
  },
});
