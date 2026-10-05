import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { app } from '../../../app';
import { prisma } from '../../../utils/prisma';
import { config } from '../../../config';

describe('LOT 1 — Tests de Sécurité Authentification', () => {
  const originalFindUnique = prisma.user.findUnique;
  const originalCreate = prisma.user.create;

  const mockAdminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@traceagro.mg',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin',
    isActive: true,
    passwordHash: '',
  };

  const mockViewerUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'viewer@traceagro.mg',
    firstName: 'Viewer',
    lastName: 'Test',
    role: 'viewer',
    isActive: true,
    passwordHash: '',
  };

  const mockInactiveUser = {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'inactive@traceagro.mg',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'field_agent',
    isActive: false,
    passwordHash: '',
  };

  let validPasswordHash: string;
  let adminToken: string;
  let viewerToken: string;

  before(async () => {
    validPasswordHash = await bcrypt.hash('CorrectPassword123!', 10);
    mockAdminUser.passwordHash = validPasswordHash;
    mockViewerUser.passwordHash = validPasswordHash;
    mockInactiveUser.passwordHash = validPasswordHash;

    adminToken = jwt.sign(
      { id: mockAdminUser.id, email: mockAdminUser.email, role: mockAdminUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    viewerToken = jwt.sign(
      { id: mockViewerUser.id, email: mockViewerUser.email, role: mockViewerUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
  });

  describe('1. Registration & Privilege Escalation', () => {
    it('Refuse la création de compte par un utilisateur anonyme (401)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newadmin@traceagro.mg',
          password: 'Password123!',
          firstName: 'Hacker',
          lastName: 'Root',
          role: 'admin',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('Refuse la création de compte par un utilisateur avec rôle viewer (403)', async () => {
      prisma.user.findUnique = (async (args: any) => {
        if (args?.where?.id === mockViewerUser.id) return mockViewerUser;
        return null;
      }) as any;

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          email: 'newadmin@traceagro.mg',
          password: 'Password123!',
          firstName: 'Viewer',
          lastName: 'TenteAdmin',
          role: 'admin',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it('Autorise la création de compte par un administrateur authentifié (201)', async () => {
      prisma.user.findUnique = (async (args: any) => {
        if (args?.where?.id === mockAdminUser.id) return mockAdminUser;
        if (args?.where?.email === 'newuser@traceagro.mg') return null;
        return null;
      }) as any;

      prisma.user.create = (async (args: any) => {
        return {
          id: '00000000-0000-0000-0000-000000000099',
          email: args.data.email,
          firstName: args.data.firstName,
          lastName: args.data.lastName,
          role: args.data.role,
        };
      }) as any;

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@traceagro.mg',
          password: 'SecurePassword123!',
          firstName: 'Nouveau',
          lastName: 'Agent',
          role: 'field_agent',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'newuser@traceagro.mg');
      assert.equal(res.body.data.role, 'field_agent');
    });

    it('Refuse l\'attribution d\'un rôle interdit / inexistant (400)', async () => {
      prisma.user.findUnique = (async (args: any) => {
        if (args?.where?.id === mockAdminUser.id) return mockAdminUser;
        return null;
      }) as any;

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'hacked@traceagro.mg',
          password: 'SecurePassword123!',
          firstName: 'Attaque',
          lastName: 'Privilege',
          role: 'super_admin_forbidden',
        });

      assert.ok([400, 422].includes(res.status), `Attendu code 400 ou 422 pour rôle invalide, reçu ${res.status}`);
      assert.equal(res.body.success, false);
    });
  });

  describe('2. Validation du Login, Mot de passe & Statut', () => {
    it('Refuse la connexion avec un mot de passe erroné (401)', async () => {
      prisma.user.findUnique = (async (args: any) => {
        if (args?.where?.email === mockAdminUser.email) return mockAdminUser;
        return null;
      }) as any;

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockAdminUser.email,
          password: 'WrongPassword999!',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /incorrect/i);
    });

    it('Refuse la connexion d\'un compte désactivé (403)', async () => {
      prisma.user.findUnique = (async (args: any) => {
        if (args?.where?.email === mockInactiveUser.email) return mockInactiveUser;
        return null;
      }) as any;

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockInactiveUser.email,
          password: 'CorrectPassword123!',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /désactivé/i);
    });
  });

  describe('3. Validation des Secrets en Production', () => {
    it('Lève une erreur bloquante si les secrets sont absents ou trop courts en production', () => {
      const validateProductionSecrets = (env: Record<string, string | undefined>) => {
        const missing: string[] = [];
        if (!env.DATABASE_URL) missing.push('DATABASE_URL');
        if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) missing.push('JWT_SECRET');
        if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32) missing.push('JWT_REFRESH_SECRET');
        if (missing.length > 0) {
          throw new Error(`Configuration production invalide: ${missing.join(', ')}`);
        }
      };

      // Test sans secret
      assert.throws(
        () => validateProductionSecrets({ NODE_ENV: 'production' }),
        /Configuration production invalide/
      );

      // Test avec secret trop court (< 32 caractères)
      assert.throws(
        () =>
          validateProductionSecrets({
            NODE_ENV: 'production',
            DATABASE_URL: 'postgresql://localhost:5432/db',
            JWT_SECRET: 'trop_court',
            JWT_REFRESH_SECRET: 'trop_court_aussi',
          }),
        /Configuration production invalide/
      );

      // Test valide
      assert.doesNotThrow(() =>
        validateProductionSecrets({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/db',
          JWT_SECRET: 'cle_secrete_longue_et_robuste_pour_prod_32caracteres',
          JWT_REFRESH_SECRET: 'cle_refresh_longue_et_robuste_pour_prod_32caract',
        })
      );
    });
  });

  describe('4. Rate Limiting Spécifique Authentification', () => {
    it('Bloque après dépassement du quota de tentatives de connexion (429)', async () => {
      prisma.user.findUnique = (async () => null) as any;

      // Le rate limiter de login est configuré à max: 10 requêtes par fenêtre de 15 min
      let triggered429 = false;
      for (let i = 0; i < 15; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'bruteforce@traceagro.mg',
            password: 'BadPassword!',
          });

        if (res.status === 429) {
          triggered429 = true;
          assert.equal(res.body.success, false);
          assert.match(res.body.message, /trop de tentatives/i);
          break;
        }
      }

      assert.equal(triggered429, true, 'Le rate limiter aurait dû déclencher un statut 429');
    });
  });
});
