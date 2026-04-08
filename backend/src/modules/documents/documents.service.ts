import { prisma } from '../../utils/prisma';
import { generateQRCode } from '../../utils/qrcode';
import { config } from '../../config';

// ─── Service Documents ────────────────────────────────────────────────────────
export class DocumentsService {

  async getAll(lotId?: string, producerId?: string, shipmentId?: string, docType?: string, search?: string) {
    const where: any = {};
    if (lotId)      where.lotId      = lotId;
    if (producerId) where.producerId = producerId;
    if (shipmentId) where.shipmentId = shipmentId;
    if (docType)    where.docType    = docType;
    if (search)     where.name       = { contains: search, mode: 'insensitive' };

    return prisma.document.findMany({
      where,
      include: {
        lot:      { select: { id: true, lotNumber: true } },
        producer: { select: { id: true, name: true } },
        shipment: { select: { id: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        lot:      { select: { id: true, lotNumber: true } },
        producer: { select: { id: true, name: true } },
        shipment: { select: { id: true, reference: true } },
      },
    });
    if (!doc) throw { statusCode: 404, message: 'Document introuvable' };
    return doc;
  }

  async getStats() {
    const [total, byType] = await Promise.all([
      prisma.document.count(),
      prisma.document.groupBy({ by: ['docType'], _count: { id: true } }),
    ]);
    return { total, byType: byType.map(r => ({ type: r.docType, count: r._count.id })) };
  }

  async create(data: any) {
    return prisma.document.create({
      data,
      include: {
        lot:      { select: { id: true, lotNumber: true } },
        producer: { select: { id: true, name: true } },
        shipment: { select: { id: true, reference: true } },
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.document.update({ where: { id }, data });
  }

  async delete(id: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Document introuvable' };
    return prisma.document.delete({ where: { id } });
  }

  async getExpiringCertifications(days = 60) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return prisma.certification.findMany({
      where: { expiresAt: { lte: futureDate }, status: 'active' },
      include: { producer: { select: { id: true, name: true, region: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  }
}

export const documentsService = new DocumentsService();
