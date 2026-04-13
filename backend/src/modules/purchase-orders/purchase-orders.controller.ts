import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../utils/prisma';

const PO_INCLUDE = {
  client: true,
  lot: {
    select: {
      id: true, lotNumber: true, quantityKg: true, availableKg: true,
      producer: { select: { name: true, region: true } },
      product: { select: { name: true } },
    },
  },
  conditioningOrders: {
    select: { id: true, status: true, quantityKg: true, passNumber: true, createdAt: true },
  },
  subLots: {
    select: { id: true, lotNumber: true, quantityKg: true, status: true, subLotIndex: true },
  },
};

// Génère le prochain numéro PO
async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: { poNumber: { startsWith: `PO-${year}-` } },
  });
  return `PO-${year}-${String(count + 1).padStart(3, '0')}`;
}

export const getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { clientId, lotId, status } = req.query as Record<string, string>;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (lotId)    where.lotId    = lotId;
    if (status)   where.status   = status;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: PO_INCLUDE,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    return res.json({ success: true, data: orders, total });
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: PO_INCLUDE,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Bon de commande introuvable' });
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      poNumber: customPoNumber, clientId, lotId, quantityKg,
      destination, deliveryDate,
      specGrade, specHumidityMin, specHumidityMax, specLengthMin,
      specCertifications, specPackaging, specNotes,
    } = req.body;

    if (!clientId || !lotId || !quantityKg || !destination || !deliveryDate) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
    }

    // Vérifier quantité disponible
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return res.status(404).json({ success: false, message: 'Lot introuvable' });

    const available = lot.availableKg ?? lot.quantityKg;
    if (quantityKg > available) {
      return res.status(400).json({
        success: false,
        message: `Quantité insuffisante. Disponible: ${available} kg, demandé: ${quantityKg} kg`,
      });
    }

    const poNumber = customPoNumber || await generatePoNumber();

    // Vérifier unicité si numéro manuel
    if (customPoNumber) {
      const exists = await prisma.purchaseOrder.findUnique({ where: { poNumber: customPoNumber } });
      if (exists) return res.status(400).json({ success: false, message: `Le PO ${customPoNumber} existe déjà` });
    }

    // Créer le PO
    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        clientId,
        lotId,
        quantityKg: parseFloat(quantityKg),
        destination,
        deliveryDate: new Date(deliveryDate),
        specGrade:          specGrade || null,
        specHumidityMin:    specHumidityMin ? parseFloat(specHumidityMin) : null,
        specHumidityMax:    specHumidityMax ? parseFloat(specHumidityMax) : null,
        specLengthMin:      specLengthMin   ? parseFloat(specLengthMin)   : null,
        specCertifications: specCertifications || [],
        specPackaging:      specPackaging || null,
        specNotes:          specNotes || null,
      },
      include: PO_INCLUDE,
    });

    // Déduire la quantité disponible du lot
    await prisma.lot.update({
      where: { id: lotId },
      data: { availableKg: available - parseFloat(quantityKg) },
    });

    // Enregistrer l'événement dans l'historique
    await prisma.lotEvent.create({
      data: {
        lotId,
        eventType: 'po_created',
        description: `Bon de commande ${poNumber} créé — ${quantityKg} kg réservés pour ${order.client?.name || clientId}`,
        quantityKg: parseFloat(quantityKg),
        relatedId: order.id,
        relatedType: 'purchase_order',
        createdBy: req.user?.email,
      },
    });

    return res.status(201).json({ success: true, data: order, message: 'Bon de commande créé' });
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      status, destination, deliveryDate,
      specGrade, specHumidityMin, specHumidityMax, specLengthMin,
      specCertifications, specPackaging, specNotes,
    } = req.body;

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(status       && { status }),
        ...(destination  && { destination }),
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
        ...(specGrade          !== undefined && { specGrade }),
        ...(specHumidityMin    !== undefined && { specHumidityMin:    parseFloat(specHumidityMin) }),
        ...(specHumidityMax    !== undefined && { specHumidityMax:    parseFloat(specHumidityMax) }),
        ...(specLengthMin      !== undefined && { specLengthMin:      parseFloat(specLengthMin) }),
        ...(specCertifications !== undefined && { specCertifications }),
        ...(specPackaging      !== undefined && { specPackaging }),
        ...(specNotes          !== undefined && { specNotes }),
      },
      include: PO_INCLUDE,
    });
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, message: 'PO introuvable' });

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer un PO expédié ou livré' });
    }

    // Remettre la quantité disponible sur le lot
    const lot = await prisma.lot.findUnique({ where: { id: order.lotId } });
    if (lot) {
      await prisma.lot.update({
        where: { id: order.lotId },
        data: { availableKg: (lot.availableKg ?? lot.quantityKg) + order.quantityKg },
      });
    }

    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Bon de commande supprimé' });
  } catch (err) { next(err); }
};
