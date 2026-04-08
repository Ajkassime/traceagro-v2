import { prisma } from '../../utils/prisma';
import { generateQRCode } from '../../utils/qrcode';
import { config } from '../../config';

const SHIPMENT_INCLUDE = {
  shipmentLots: {
    include: {
      lot: {
        include: {
          product:  { select: { name: true, category: true } },
          producer: { select: { id: true, name: true, region: true } },
          _count:   { select: { processingSteps: true } },
        },
      },
    },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { shipmentLots: true } },
};

export class ShipmentsService {

  async getAll(page = 1, limit = 20, status?: string, search?: string) {
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { reference:       { contains: search, mode: 'insensitive' } },
      { carrierName:     { contains: search, mode: 'insensitive' } },
      { containerNumber: { contains: search, mode: 'insensitive' } },
    ];

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        skip, take: limit, where,
        include: {
          ...SHIPMENT_INCLUDE,
          shipmentLots: {
            include: {
              lot: {
                include: {
                  product:  { select: { name: true } },
                  producer: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shipment.count({ where }),
    ]);
    return { shipments, total };
  }

  async getById(id: string) {
    const shipment = await prisma.shipment.findUnique({ where: { id }, include: SHIPMENT_INCLUDE });
    if (!shipment) throw { statusCode: 404, message: 'Expédition introuvable' };
    return shipment;
  }

  // ── Page publique (sans auth) ──────────────────────────────────────────────
  async getPublic(id: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        shipmentLots: {
          include: {
            lot: {
              include: {
                product:  { select: { name: true, category: true } },
                producer: { select: { name: true, region: true, country: true, certifications: true } },
                _count:   { select: { processingSteps: true } },
              },
            },
          },
        },
        documents: {
          where: { docType: { in: ['phytosanitary', 'eudr_proof', 'organic_cert', 'fair_trade_cert'] as any } },
        },
      },
    });
    if (!shipment) throw { statusCode: 404, message: 'Expédition introuvable' };
    return shipment;
  }

  // ── Créer + générer QR ────────────────────────────────────────────────────
  async create(data: any) {
    const { lotIds, ...shipmentData } = data;

    // Créer d'abord sans QR
    const shipment = await prisma.shipment.create({
      data: {
        ...shipmentData,
        departureDate:   shipmentData.departureDate   ? new Date(shipmentData.departureDate)   : undefined,
        expectedArrival: shipmentData.expectedArrival ? new Date(shipmentData.expectedArrival) : undefined,
        shipmentLots: lotIds ? { create: lotIds.map((id: string) => ({ lotId: id })) } : undefined,
      },
      include: SHIPMENT_INCLUDE,
    });

    // Générer le QR avec le vrai ID
    const publicUrl = `${config.frontendUrl}/shipment-public/${shipment.id}`;
    const qrCodeUrl = await generateQRCode(publicUrl);

    return prisma.shipment.update({
      where: { id: shipment.id },
      data: { qrCodeUrl },
      include: SHIPMENT_INCLUDE,
    });
  }

  async update(id: string, data: any) {
    const { lotIds, ...shipmentData } = data;
    const updateData: any = { ...shipmentData };
    if (shipmentData.departureDate)   updateData.departureDate   = new Date(shipmentData.departureDate);
    if (shipmentData.expectedArrival) updateData.expectedArrival = new Date(shipmentData.expectedArrival);
    if (shipmentData.actualArrival)   updateData.actualArrival   = new Date(shipmentData.actualArrival);

    if (lotIds !== undefined) {
      await prisma.shipmentLot.deleteMany({ where: { shipmentId: id } });
      updateData.shipmentLots = { create: lotIds.map((lotId: string) => ({ lotId })) };
    }
    return prisma.shipment.update({ where: { id }, data: updateData, include: SHIPMENT_INCLUDE });
  }

  async delete(id: string) {
    const lotsCount = await prisma.shipmentLot.count({ where: { shipmentId: id } });
    if (lotsCount > 0) {
      await prisma.shipmentLot.deleteMany({ where: { shipmentId: id } });
    }
    return prisma.shipment.delete({ where: { id } });
  }

  async addLots(shipmentId: string, lotIds: string[]) {
    const creates = lotIds.map((lotId) =>
      prisma.shipmentLot.upsert({
        where:  { shipmentId_lotId: { shipmentId, lotId } },
        update: {},
        create: { shipmentId, lotId },
      })
    );
    return Promise.all(creates);
  }

  async removeLot(shipmentId: string, lotId: string) {
    return prisma.shipmentLot.delete({
      where: { shipmentId_lotId: { shipmentId, lotId } },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.shipment.update({
      where: { id },
      data:  { status: status as any, ...(status === 'delivered' ? { actualArrival: new Date() } : {}) },
      include: SHIPMENT_INCLUDE,
    });
  }

  async getStats() {
    const [total, byStatus, recentShipments] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.shipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { shipmentLots: true } } },
      }),
    ]);
    return { total, byStatus, recentShipments };
  }
}

export const shipmentsService = new ShipmentsService();
