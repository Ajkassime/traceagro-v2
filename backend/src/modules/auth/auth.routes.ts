import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schema';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { authLoginLimiter, authRefreshLimiter, authRegisterLimiter } from '../../middleware/rateLimiter';

export const authRoutes = Router();

authRoutes.post('/login', authLoginLimiter, validate(loginSchema), authController.login.bind(authController));
authRoutes.post('/register', authenticate, requireAdmin, authRegisterLimiter, validate(registerSchema), authController.register.bind(authController));
authRoutes.post('/refresh', authRefreshLimiter, authController.refresh.bind(authController));
authRoutes.get('/me', authenticate, authController.me.bind(authController));
