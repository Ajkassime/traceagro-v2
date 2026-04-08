import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), authController.login.bind(authController));
authRoutes.post('/register', validate(registerSchema), authController.register.bind(authController));
authRoutes.post('/refresh', authController.refresh.bind(authController));
authRoutes.get('/me', authenticate, authController.me.bind(authController));
