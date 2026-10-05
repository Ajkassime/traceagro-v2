import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ANTIFRAUD_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
});

const parsed = envSchema.parse(process.env);

// Validation stricte en environnement de production
if (parsed.NODE_ENV === 'production') {
  const missing: string[] = [];

  if (!parsed.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!parsed.JWT_SECRET || parsed.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET (minimum 32 caractères requis)');
  }

  if (!parsed.JWT_REFRESH_SECRET || parsed.JWT_REFRESH_SECRET.length < 32) {
    missing.push('JWT_REFRESH_SECRET (minimum 32 caractères requis)');
  }

  if (parsed.JWT_SECRET && parsed.JWT_REFRESH_SECRET && parsed.JWT_SECRET === parsed.JWT_REFRESH_SECRET) {
    missing.push('JWT_SECRET et JWT_REFRESH_SECRET doivent être distincts');
  }

  if (!parsed.FRONTEND_URL) {
    missing.push('FRONTEND_URL');
  } else {
    try {
      new URL(parsed.FRONTEND_URL);
    } catch {
      missing.push('FRONTEND_URL doit être une URL valide');
    }
  }

  if (missing.length > 0) {
    const errorMsg = `❌ ERREUR CRITIQUE DE CONFIGURATION EN PRODUCTION :\n${missing.map((m) => `  - ${m}`).join('\n')}\nLe serveur refuse de démarrer.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// En dev/test, si les secrets ne sont pas définis, utiliser des clés de test locales explicites
const devJwtSecret = 'traceagro_dev_local_jwt_secret_key_32chars_min!';
const devRefreshSecret = 'traceagro_dev_local_refresh_secret_key_32chars!';
const devAntifraudSecret = 'traceagro_dev_local_antifraud_secret_key_32chars!';

export const config = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  databaseUrl: parsed.DATABASE_URL || '',
  jwtSecret: parsed.JWT_SECRET || devJwtSecret,
  jwtRefreshSecret: parsed.JWT_REFRESH_SECRET || devRefreshSecret,
  antifraudSecret: parsed.ANTIFRAUD_SECRET || parsed.JWT_SECRET || devAntifraudSecret,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
  frontendUrl: parsed.FRONTEND_URL,
  cloudinary: {
    cloudName: parsed.CLOUDINARY_CLOUD_NAME,
    apiKey: parsed.CLOUDINARY_API_KEY,
    apiSecret: parsed.CLOUDINARY_API_SECRET,
  },
  openaiApiKey: parsed.OPENAI_API_KEY,
};
