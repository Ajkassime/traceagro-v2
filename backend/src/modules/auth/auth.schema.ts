import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const VALID_ROLES = ['admin', 'field_agent', 'quality_manager', 'viewer'] as const;

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: 'Rôle invalide. Rôles autorisés: admin, field_agent, quality_manager, viewer' }),
  }).default('viewer'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
