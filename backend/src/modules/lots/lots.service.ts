import crypto from 'crypto';
import { prisma } from '../../utils/prisma';
import { generateLotNumber } from '../../utils/lotNumber';
import { generateQRCode } from '../../utils/qrcode';
import { config } from '../../config';
import type {
  UpsertReceptionInput,
  UpsertPhaseInput,
  AddTeamMemberInput,
  UpdateTeamMemberInput,
  UpsertStockEntryInput,
} from './lots.schema';

const LOT_INCLUDE = {
  producer: { select: { id: true, name: true, region: true, country: true } },
  product:  { select: { id: true, name: true, category: true, unit: true } },
  processingSteps: {
    orderBy: { stepOrder: 'asc' as const },
    include: { photos: true },
  },
  photos: true,
  documents: true,
  shipmentLots: { include: { shipment: { select: { id: true, reference: true, status: true } } } },
};

export class LotsService {
  private isValidQrCode(qrCodeUrl?: string | null) {
    return !!qrCodeUrl && qrCodeUrl.startsWith('data:image/') && !qrCodeUrl.includes('placeholder');
  }

  private async ensureQrCode(lotId: string, currentQrCodeUrl?: string | null) {
    if (this.isValidQrCode(currentQrCodeUrl)) return currentQrCodeUrl as string;

    const publicUrl = `${config.frontendUrl}/lot-public/${lotId}`;
    const qrCodeUrl = await generateQRCode(publicUrl);

    await prisma.lot.update({
      where: { id: lotId },
      data: { qrCodeUrl },
    });

    return qrCodeUrl;
  }

  // ─── Liste paginée ────────────────────────────────────────────────────────
  async getAll(page = 1, limit = 20, search?: string, status?: string, productId?: string, producerId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: 'insensitive' } },
        { producer: { name: { contains: search, mode: 'insensitive' } } },
        { product:  { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status)     where.status    = status;
    if (productId)  where.productId = productId;
    if (producerId) where.producerId = producerId;

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        skip, take: limit, where,
        include: {
          producer: { select: { id: true, name: true, region: true } },
          product:  { select: { id: true, name: true, category: true, unit: true } },
          _count:   { select: { processingSteps: true, photos: true, scanLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lot.count({ where }),
    ]);
    return { lots, total };
  }

  // ─── Détail (admin) ───────────────────────────────────────────────────────
  async getById(id: string) {
    const lot = await prisma.lot.findUnique({ where: { id }, include: LOT_INCLUDE });
    if (!lot) throw { statusCode: 404, message: 'Lot introuvable' };

    if (!this.isValidQrCode(lot.qrCodeUrl)) {
      const qrCodeUrl = await this.ensureQrCode(lot.id, lot.qrCodeUrl);
      return { ...lot, qrCodeUrl };
    }

    return lot;
  }

  // ─── Page publique QR (sans auth) ─────────────────────────────────────────
  async getPublic(id: string) {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        producer: {
          include: {
            certifications: { orderBy: { expiresAt: 'asc' } },
            photos: true,
          },
        },
        product: true,
        processingSteps: {
          orderBy: { stepOrder: 'asc' },
          include: { photos: true },
        },
        photos: true,
        documents: {
          where: {
            docType: { in: ['organic_cert', 'fair_trade_cert', 'eudr_proof', 'phytosanitary'] as any },
          },
        },
        shipmentLots: {
          include: {
            shipment: {
              select: { reference: true, status: true, arrivalLocation: true, departureLocation: true, departureDate: true, actualArrival: true },
            },
          },
        },
        _count: { select: { scanLogs: true } },
      },
    });
    if (!lot) throw { statusCode: 404, message: 'Lot introuvable' };

    if (!this.isValidQrCode(lot.qrCodeUrl)) {
      const qrCodeUrl = await this.ensureQrCode(lot.id, lot.qrCodeUrl);
      return { ...lot, qrCodeUrl };
    }

    return lot;
  }

  // ─── Enregistrer un scan ──────────────────────────────────────────────────
  async recordScan(lotId: string, meta: {
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    device?: string;
  }) {
    const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { id: true } });
    if (!lot) return null;

    return prisma.scanLog.create({
      data: {
        lotId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        referer:   meta.referer,
        country:   meta.country   || 'Inconnu',
        city:      meta.city      || 'Inconnue',
        device:    meta.device    || detectDevice(meta.userAgent),
      },
    });
  }

  // ─── Analytics des scans ──────────────────────────────────────────────────
  async getScanAnalytics(lotId: string) {
    const [total, byDay, byCountry, byDevice, recent] = await Promise.all([
      prisma.scanLog.count({ where: { lotId } }),

      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE_TRUNC('day', created_at)::text AS day, COUNT(*) AS count
        FROM scan_logs
        WHERE lot_id = ${lotId}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
      `,

      prisma.scanLog.groupBy({
        by: ['country'],
        where: { lotId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.scanLog.groupBy({
        by: ['device'],
        where: { lotId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      prisma.scanLog.findMany({
        where: { lotId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { country: true, city: true, device: true, createdAt: true },
      }),
    ]);

    return {
      total,
      byDay: byDay.map((r: any) => ({ day: r.day, count: Number(r.count) })),
      byCountry: byCountry.map((r: any) => ({ country: r.country || 'Inconnu', count: r._count.id })),
      byDevice:  byDevice.map((r: any) => ({ device: r.device || 'Inconnu', count: r._count.id })),
      recent,
    };
  }

  // ─── Rapport Anti-Contrefaçon complet ────────────────────────────────────
  async getAntiFraudReport(lotId: string) {
    const now    = new Date();
    const hour1  = new Date(now.getTime() - 60 * 60 * 1000);
    const hour24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalScans,
      scansLast1h,
      scansLast24h,
      scansLast7d,
      suspiciousScans,
      byIpLast1h,
      byCountryLast24h,
      recentScans,
      lot,
    ] = await Promise.all([
      prisma.scanLog.count({ where: { lotId } }),
      prisma.scanLog.count({ where: { lotId, createdAt: { gte: hour1 } } }),
      prisma.scanLog.count({ where: { lotId, createdAt: { gte: hour24 } } }),
      prisma.scanLog.count({ where: { lotId, createdAt: { gte: day7 } } }),
      prisma.scanLog.count({ where: { lotId, isSuspicious: true } }),

      prisma.scanLog.groupBy({
        by: ['ipAddress'],
        where: { lotId, createdAt: { gte: hour1 } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.scanLog.groupBy({
        by: ['country'],
        where: { lotId, createdAt: { gte: hour24 } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      prisma.scanLog.findMany({
        where: { lotId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { country: true, city: true, device: true, createdAt: true, isSuspicious: true, ipAddress: true },
      }),

      prisma.lot.findUnique({
        where: { id: lotId },
        select: { lotNumber: true, createdAt: true },
      }),
    ]);

    let confidenceScore = 100;
    const alerts: string[] = [];

    const burstIps = byIpLast1h.filter((r: any) => r._count.id >= 5);
    if (burstIps.length > 0) {
      confidenceScore -= 30;
      burstIps.forEach((ip: any) => {
        alerts.push(`Burst détecté : ${ip._count.id} scans depuis l'IP ${ip.ipAddress} en 1h`);
      });
    }

    if (scansLast1h > 20) {
      confidenceScore -= 20;
      alerts.push(`Volume élevé : ${scansLast1h} scans en 1 heure`);
    }

    if (byCountryLast24h.length > 3) {
      confidenceScore -= 15;
      alerts.push(`Géolocalisation suspecte : ${byCountryLast24h.length} pays différents en 24h`);
    }

    if (suspiciousScans > 0) {
      confidenceScore -= Math.min(suspiciousScans * 5, 25);
      alerts.push(`${suspiciousScans} scan(s) marqué(s) comme suspect(s)`);
    }

    confidenceScore = Math.max(0, Math.min(100, confidenceScore));

    let risk: 'low' | 'medium' | 'high' | 'critical';
    if (confidenceScore >= 85)      risk = 'low';
    else if (confidenceScore >= 60) risk = 'medium';
    else if (confidenceScore >= 30) risk = 'high';
    else                            risk = 'critical';

    const secret = process.env.JWT_SECRET || 'traceagro-antifr-secret';
    const payload = `${lotId}:${lot?.lotNumber}:${lot?.createdAt?.toISOString()}`;
    const verificationToken = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    return {
      lotId,
      lotNumber: lot?.lotNumber,
      confidenceScore,
      risk,
      alerts,
      verificationToken,
      stats: {
        total: totalScans,
        last1h: scansLast1h,
        last24h: scansLast24h,
        last7d: scansLast7d,
        suspicious: suspiciousScans,
      },
      activeIps: byIpLast1h.map((r: any) => ({
        ip: r.ipAddress?.replace(/\.\d+$/, '.***') || 'masqué',
        count: r._count.id,
        suspicious: r._count.id >= 5,
      })),
      recentCountries: byCountryLast24h.map((r: any) => ({
        country: r.country || 'Inconnu',
        count: r._count.id,
      })),
      recentScans,
      generatedAt: now.toISOString(),
    };
  }

  // ─── recordScan avec détection anomalies ─────────────────────────────────
  async recordScanWithCheck(lotId: string, meta: {
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    device?: string;
  }) {
    const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { id: true } });
    if (!lot) return null;

    const hour1 = new Date(Date.now() - 60 * 60 * 1000);

    let isSuspicious = false;
    let suspicionReason: string | undefined;

    if (meta.ipAddress) {
      const ipScansLastHour = await prisma.scanLog.count({
        where: { lotId, ipAddress: meta.ipAddress, createdAt: { gte: hour1 } },
      });
      if (ipScansLastHour >= 4) {
        isSuspicious = true;
        suspicionReason = `IP ${meta.ipAddress} : ${ipScansLastHour + 1} scans en 1h`;
      }
    }

    return prisma.scanLog.create({
      data: {
        lotId,
        ipAddress:       meta.ipAddress,
        userAgent:       meta.userAgent,
        referer:         meta.referer,
        country:         meta.country   || 'Inconnu',
        city:            meta.city      || 'Inconnue',
        device:          meta.device    || detectDevice(meta.userAgent),
        isSuspicious,
        suspicionReason,
      },
    });
  }

  // ─── Créer un lot ─────────────────────────────────────────────────────────
  async create(data: any) {
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw { statusCode: 404, message: 'Produit introuvable' };

    const lotNumber = await generateLotNumber(data.productId);
    const publicUrl = `${config.frontendUrl}/lot-public`;
    const tempId    = crypto.randomUUID();
    const qrUrl     = `${publicUrl}/${tempId}`;
    const qrCode    = await generateQRCode(qrUrl);

    const lot = await (prisma.lot.create as any)({
      data: {
        ...data,
        lotNumber,
        qrCodeUrl: qrCode,
        harvestDate: new Date(data.harvestDate),
      },
      include: LOT_INCLUDE,
    });

    const realQrUrl = `${publicUrl}/${lot.id}`;
    const realQr    = await generateQRCode(realQrUrl);
    return prisma.lot.update({
      where: { id: lot.id },
      data: { qrCodeUrl: realQr },
      include: LOT_INCLUDE,
    });
  }

  // ─── Mettre à jour ────────────────────────────────────────────────────────
  async update(id: string, data: any) {
    const { regenerateQr, ...rest } = data;
    const updateData: any = { ...rest };

    if (regenerateQr) {
      const publicUrl = `${config.frontendUrl}/lot-public/${id}`;
      updateData.qrCodeUrl = await generateQRCode(publicUrl);
    }

    return prisma.lot.update({ where: { id }, data: updateData, include: LOT_INCLUDE });
  }

  // ─── Ajouter une étape de transformation ──────────────────────────────────
  async addStep(lotId: string, data: any) {
    const count = await prisma.processingStep.count({ where: { lotId } });
    return (prisma.processingStep.create as any)({
      data: { ...data, lotId, stepOrder: count + 1, startedAt: new Date(data.startedAt) },
      include: { photos: true },
    });
  }

  private async findLotOrThrow(id: string) {
    const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true } });
    if (!lot) throw { statusCode: 404, message: 'Lot introuvable' };
    return lot;
  }

  // ─── RÉCEPTION ───────────────────────────────────────────────────────────────
  async getReception(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotReception.findUnique({ where: { lotId } });
  }

  async upsertReception(lotId: string, data: UpsertReceptionInput) {
    await this.findLotOrThrow(lotId);
    return prisma.lotReception.upsert({
      where:  { lotId },
      update: data,
      create: { lotId, ...data },
    });
  }

  // ─── WORKFLOW PHASES ─────────────────────────────────────────────────────────
  async getWorkflow(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotWorkflowPhase.findMany({
      where:   { lotId },
      include: { teamMembers: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ vanillaType: 'asc' }, { phaseType: 'asc' }, { phaseIndex: 'asc' }],
    });
  }

  async upsertPhase(
    lotId: string,
    vanillaType: string,
    phaseType: string,
    phaseIndex: number,
    data: UpsertPhaseInput,
  ) {
    await this.findLotOrThrow(lotId);
    return prisma.lotWorkflowPhase.upsert({
      where: {
        lotId_vanillaType_phaseType_phaseIndex: { lotId, vanillaType, phaseType, phaseIndex },
      },
      update: data,
      create: { lotId, vanillaType, phaseType, phaseIndex, ...data },
      include: { teamMembers: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // ─── ÉQUIPE ──────────────────────────────────────────────────────────────────
  async addTeamMember(phaseId: string, data: AddTeamMemberInput) {
    const phase = await prisma.lotWorkflowPhase.findUnique({ where: { id: phaseId } });
    if (!phase) throw { statusCode: 404, message: 'Phase introuvable' };
    if (phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    return (prisma.lotTeamMember.create as any)({ data: { phaseId, ...data } });
  }

  async updateTeamMember(memberId: string, data: UpdateTeamMemberInput) {
    const member = await prisma.lotTeamMember.findUnique({
      where:   { id: memberId },
      include: { phase: { select: { isValidated: true } } },
    });
    if (!member) throw { statusCode: 404, message: 'Membre introuvable' };
    if (member.phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    return prisma.lotTeamMember.update({ where: { id: memberId }, data });
  }

  async deleteTeamMember(memberId: string) {
    const member = await prisma.lotTeamMember.findUnique({
      where:   { id: memberId },
      include: { phase: { select: { isValidated: true } } },
    });
    if (!member) throw { statusCode: 404, message: 'Membre introuvable' };
    if (member.phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    await prisma.lotTeamMember.delete({ where: { id: memberId } });
  }

  // ─── ENTRÉE STOCK ────────────────────────────────────────────────────────────
  async getStockEntry(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotStockEntry.findUnique({ where: { lotId } });
  }

  async upsertStockEntry(lotId: string, data: UpsertStockEntryInput) {
    await this.findLotOrThrow(lotId);
    return prisma.lotStockEntry.upsert({
      where:  { lotId },
      update: data,
      create: { lotId, ...data },
    });
  }

  // ─── Stats dashboard ──────────────────────────────────────────────────────
  async getDashboardStats() {
    const [
      totalLots,
      activeProducers,
      inTransit,
      exported,
      byStatusRaw,
      recentLots,
      avgQuality,
    ] = await Promise.all([
      prisma.lot.count(),
      prisma.producer.count({ where: { isActive: true } }),
      prisma.shipment.count({ where: { status: 'in_transit' } }),
      prisma.shipment.count({ where: { status: 'delivered' } }),
      prisma.lot.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.lot.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          producer: { select: { name: true } },
          product:  { select: { name: true } },
        },
      }),
      prisma.lot.aggregate({ _avg: { qualityScore: true } }),
    ]);

    const byStatus = byStatusRaw.map((row: any) => ({
      status: row.status,
      count: row._count.id,
    }));

    return {
      totalLots,
      activeProducers,
      inTransit,
      exported,
      byStatus,
      recentLots,
      avgQuality: avgQuality._avg.qualityScore,
      total: totalLots,
    };
  }
}

// ─── Helper: détecter le type d'appareil ──────────────────────────────────
function detectDevice(ua?: string): string {
  if (!ua) return 'Inconnu';
  const u = ua.toLowerCase();
  if (/iphone|ipod/.test(u))     return 'iPhone';
  if (/ipad/.test(u))            return 'iPad';
  if (/android.*mobile/.test(u)) return 'Android Mobile';
  if (/android/.test(u))         return 'Android Tablet';
  if (/windows/.test(u))         return 'Windows PC';
  if (/mac/.test(u))             return 'Mac';
  if (/linux/.test(u))           return 'Linux';
  return 'Autre';
}

export const lotsService = new LotsService();
