import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { config } from '../../config';
import { LoginInput, RegisterInput } from './auth.schema';

export class AuthService {
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw { statusCode: 401, message: 'Email ou mot de passe incorrect' };
    if (!user.isActive) throw { statusCode: 403, message: 'Compte désactivé' };

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw { statusCode: 401, message: 'Email ou mot de passe incorrect' };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn as any }
    );

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw { statusCode: 409, message: 'Cet email est déjà utilisé' };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return user;
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtRefreshSecret) as { id: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.isActive) throw new Error('Invalid');

      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );
      return { token: newToken };
    } catch {
      throw { statusCode: 401, message: 'Refresh token invalide' };
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
    return user;
  }
}

export const authService = new AuthService();
