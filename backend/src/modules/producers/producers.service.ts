import { prisma } from '../../utils/prisma';

const PRODUCER_INCLUDE = {
  photos: true,
  certifications: { orderBy: { expiresAt: 'asc' as const } },
  _count: { select: { lots: true, certifications: true } },
};

export class ProducersService {
  async getAll(page = 1, limit = 20, search?: string, region?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { region: { contains: search, mode: 'insensitive' } },
    ];
    if (region) where.region = { equals: region, mode: 'insensitive' };

    const [producers, total] = await Promise.all([
      prisma.producer.findMany({ skip, take: limit, where, include: PRODUCER_INCLUDE, orderBy: { name: 'asc' } }),
      prisma.producer.count({ where }),
    ]);
    return { producers, total };
  }

  async getAllForMap() {
    return prisma.producer.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, region: true, latitude: true, longitude: true, areaHectares: true, _count: { select: { lots: true } } },
    });
  }

  // ─── NEW: enriched map data endpoint ────────────────────────────────────────
  async getMapData() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Producers with score data
    const producers = await prisma.producer.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true, name: true, region: true, country: true,
        latitude: true, longitude: true, areaHectares: true,
        lots: {
          select: {
            id: true, lotNumber: true, status: true, qualityScore: true,
            quantityKg: true, createdAt: true,
            product: { select: { name: true } },
            scanLogs: { select: { id: true, country: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        certifications: { select: { id: true, type: true, status: true, expiresAt: true } },
        _count: { select: { lots: true, certifications: true } },
      },
    });

    // 2. Scan logs with geo (last 30 days) for heatmap
    const scanLogs = await prisma.scanLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true, country: true, city: true, device: true,
        latitude: true, longitude: true, createdAt: true,
        isSuspicious: true,
        lot: { select: { id: true, lotNumber: true, producerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // 3. Shipments with departure/arrival for flow lines
    const shipments = await prisma.shipment.findMany({
      where: { status: { in: ['in_transit', 'preparing', 'delivered'] } },
      select: {
        id: true, reference: true, status: true,
        departureLocation: true, arrivalLocation: true,
        departureDate: true, expectedArrival: true, actualArrival: true,
        totalWeightKg: true, carrierName: true,
        shipmentLots: {
          select: {
            lot: {
              select: {
                id: true, lotNumber: true, quantityKg: true,
                producer: { select: { id: true, name: true, latitude: true, longitude: true, region: true } },
                product: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 4. Scan stats by country (all time)
    const scansByCountry = await prisma.scanLog.groupBy({
      by: ['country'],
      _count: { id: true },
      where: { country: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 30,
    });

    // 5. Compute producer scores
    const enrichedProducers = producers.map((p) => {
      const scores = p.lots.map((l) => l.qualityScore).filter(Boolean) as number[];
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const activeCerts = p.certifications.filter((c) => c.status === 'active').length;
      const totalScans = p.lots.reduce((acc, l) => acc + l.scanLogs.length, 0);
      const eudrRisk = activeCerts === 0 ? 'high' : activeCerts < 2 ? 'medium' : 'low';

      // score 0-100
      let score = 50;
      if (avgScore) score = Math.round(avgScore * 0.6);
      score += Math.min(activeCerts * 10, 30);
      score += Math.min(totalScans * 2, 20);
      score = Math.min(score, 100);

      return {
        ...p,
        avgQualityScore: avgScore,
        activeCertifications: activeCerts,
        totalScans,
        eudrRisk,
        compositeScore: score,
        lots: undefined, // remove raw lots from response
        lotCount: p._count.lots,
        recentLots: p.lots.slice(0, 3).map((l) => ({
          id: l.id, lotNumber: l.lotNumber, status: l.status,
          quantityKg: l.quantityKg, productName: l.product?.name,
        })),
      };
    });

    // 6. Stats summary
    const stats = {
      totalProducers: enrichedProducers.length,
      totalShipments: shipments.length,
      totalScansLast30d: scanLogs.length,
      eudrHighRisk: enrichedProducers.filter((p) => p.eudrRisk === 'high').length,
      avgScore: enrichedProducers.length
        ? Math.round(enrichedProducers.reduce((a, b) => a + b.compositeScore, 0) / enrichedProducers.length)
        : 0,
    };

    return { producers: enrichedProducers, scanLogs, shipments, scansByCountry, stats };
  }

  async getById(id: string) {
    const producer = await prisma.producer.findUnique({
      where: { id },
      include: {
        ...PRODUCER_INCLUDE,
        lots: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { name: true } } },
        },
        documents: true,
      },
    });
    if (!producer) throw { statusCode: 404, message: 'Producteur introuvable' };
    return producer;
  }

  async create(data: any) {
    return prisma.producer.create({ data, include: PRODUCER_INCLUDE });
  }

  async update(id: string, data: any) {
    return prisma.producer.update({ where: { id }, data, include: PRODUCER_INCLUDE });
  }

  async delete(id: string) {
    const lotsCount = await prisma.lot.count({ where: { producerId: id } });
    if (lotsCount > 0) throw { statusCode: 400, message: `Impossible de supprimer: ${lotsCount} lot(s) associé(s)` };
    return prisma.producer.delete({ where: { id } });
  }

  async addCertification(producerId: string, data: any) {
    return prisma.certification.create({ data: { ...data, producerId, issuedAt: new Date(data.issuedAt), expiresAt: new Date(data.expiresAt) } });
  }

  async computeProducerScore(producerId: string) {
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
      include: {
        lots: { include: { processingSteps: { select: { qualityScore: true } } } },
        certifications: { where: { status: 'active' } },
      },
    });
    if (!producer) throw { statusCode: 404, message: 'Producteur introuvable' };

    const allScores: number[] = [];
    producer.lots.forEach((lot) => {
      if (lot.qualityScore) allScores.push(lot.qualityScore);
      lot.processingSteps.forEach((s) => { if (s.qualityScore) allScores.push(s.qualityScore); });
    });

    const avgScore = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
    const certScore = Math.min(producer.certifications.length * 15, 40);
    const lotScore = Math.min(producer.lots.length * 5, 30);
    const qualityScore = avgScore ? avgScore * 0.3 : 0;
    const total = Math.round(certScore + lotScore + qualityScore);

    return {
      producerId,
      certificationScore: certScore,
      lotActivityScore: lotScore,
      qualityScore: Math.round(qualityScore),
      total: Math.min(total, 100),
      activeCertifications: producer.certifications.length,
      totalLots: producer.lots.length,
      avgQualityScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
    };
  }
}

export const producersService = new ProducersService();
