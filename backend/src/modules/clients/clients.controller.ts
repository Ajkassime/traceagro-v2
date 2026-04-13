import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../utils/prisma';

export const getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });
    return res.json({ success: true, data: clients });
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: { lot: { select: { lotNumber: true } } },
        },
        _count: { select: { purchaseOrders: true } },
      },
    });
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable' });
    return res.json({ success: true, data: client });
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, country } = req.body;
    if (!name || !country) return res.status(400).json({ success: false, message: 'Nom et pays requis' });
    const client = await prisma.client.create({ data: { name, country } });
    return res.status(201).json({ success: true, data: client });
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, country, isActive } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(country && { country }), ...(isActive !== undefined && { isActive }) },
    });
    return res.json({ success: true, data: client });
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.purchaseOrder.count({ where: { clientId: req.params.id } });
    if (count > 0) return res.status(400).json({ success: false, message: `Impossible : ${count} bon(s) de commande associé(s)` });
    await prisma.client.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Client supprimé' });
  } catch (err) { next(err); }
};
