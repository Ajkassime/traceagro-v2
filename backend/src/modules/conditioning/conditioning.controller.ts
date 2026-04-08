import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../utils/prisma';

// ─── Étapes réelles AGK-COMORES (document officiel v1 — 23/06/22) ─────────────
// Flux complet : Réception → Échaudage → Étuvage → Séchage → Triage →
//                Affinage → Classement → Mise en botte → Pesage final → Emballage
const STEP_TEMPLATE = [
  {
    stepOrder: 1,
    stepName: 'Réception',
    docs: ['CAHIER DE PESAGE', 'CAHIER STOCK VANILLE VERTE', 'BON DE LIVRAISON'],
  },
  {
    stepOrder: 2,
    stepName: 'Échaudage',
    docs: [],
    // CCP : 60–65°C, durée ~1 min — champ temperature obligatoire
  },
  {
    stepOrder: 3,
    stepName: 'Étuvage',
    docs: [],
    // Durée standard : 48 H
  },
  {
    stepOrder: 4,
    stepName: 'Séchage au soleil',
    docs: [],
  },
  {
    stepOrder: 5,
    stepName: "Séchage à l'ombre",
    docs: [],
  },
  {
    stepOrder: 6,
    stepName: 'Triage',
    docs: ['CHECK LIST CONTROLE PRODUCTION'],
  },
  {
    stepOrder: 7,
    stepName: 'Affinage',
    docs: ['FICHE MALLE'],
    // Durée variable (jusqu'à stabilité) — visites hebdomadaires
  },
  {
    stepOrder: 8,
    stepName: 'Classement',
    docs: [],
    // Fendue/Non fendue — 3ème/4ème/mauvais/sec_soleil
  },
  {
    stepOrder: 9,
    stepName: 'Mise en botte',
    docs: [],
    // Type : ficelle (N/F 3ème/4ème) | raphia (fendue/mauvais) | vrac
  },
  {
    stepOrder: 10,
    stepName: 'Pesage final',
    docs: ['CAHIER DE PESAGE'],
    // Mesure taux humidité + taux de vanilline
  },
  {
    stepOrder: 11,
    stepName: 'Emballage',
    docs: ['ÉTIQUETTE CARTON', 'FICHE SORTIE STOCK'],
    // Mise en carton tapissé papier paraffiné + étiquette + feuillard
  },
] as const;

const STEPS = {
  vanille_noire: STEP_TEMPLATE,
  vanille_rouge: STEP_TEMPLATE,
} as const;

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, productType, lotId } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (productType) where.productType = productType;
    if (lotId) where.lotId = lotId;

    const [orders, stats] = await Promise.all([
      prisma.conditioningOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          lot: { include: { product: true, producer: true } },
          steps: { orderBy: { stepOrder: 'asc' } },
        },
      }),
      prisma.conditioningOrder.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    const statsMap: Record<string, number> = {};
    stats.forEach((s) => { statsMap[s.status] = s._count.id; });

    return res.json({ success: true, data: orders, stats: statsMap });
  } catch (err) { next(err); }
};

export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.conditioningOrder.findUnique({
      where: { id: req.params.id },
      include: {
        lot: { include: { product: true, producer: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Ordre introuvable' });
    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lotId, productType, destination, passNumber } = req.body;
    if (!lotId || !productType)
      return res.status(400).json({ success: false, message: 'lotId et productType requis' });

    const stepTemplates = STEPS[productType as keyof typeof STEPS];
    if (!stepTemplates)
      return res.status(400).json({ success: false, message: 'Type de produit inconnu' });

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return res.status(404).json({ success: false, message: 'Lot introuvable' });

    const existingCount = await prisma.conditioningOrder.count({ where: { lotId } });

    const order = await prisma.conditioningOrder.create({
      data: {
        lotId,
        productType,
        destination: destination || null,
        passNumber: passNumber || existingCount + 1,
        createdBy: req.user?.email || 'system',
        status: 'en_cours',
        steps: {
          create: stepTemplates.map((s) => ({
            stepOrder: s.stepOrder,
            stepName: s.stepName,
            status: s.stepOrder === 1 ? 'en_cours' : 'en_attente',
            documents: [...s.docs],
          })),
        },
      },
      include: {
        lot: { include: { product: true, producer: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    return res.status(201).json({ success: true, data: order, message: 'Ordre de conditionnement créé' });
  } catch (err) { next(err); }
};

export const updateStep = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      operatorName, quantityIn, quantityOut,
      humidityIn, humidityOut,
      moldPercent, splitPercent, phenolPercent, pocketPercent,
      metalDetResult, boxCount, notes, documents,
      status, isConform, startedAt, completedAt,
      // Nouveaux champs AGK-COMORES
      temperature, vanillineRate, classification, isFendue, bundleType, bundleCount,
    } = req.body;

    const step = await prisma.conditioningStep.findUnique({ where: { id: req.params.stepId } });
    if (!step) return res.status(404).json({ success: false, message: 'Étape introuvable' });

    const updated = await prisma.conditioningStep.update({
      where: { id: req.params.stepId },
      data: {
        ...(operatorName  !== undefined && { operatorName }),
        ...(quantityIn    !== undefined && { quantityIn:    quantityIn    ? parseFloat(quantityIn)    : null }),
        ...(quantityOut   !== undefined && { quantityOut:   quantityOut   ? parseFloat(quantityOut)   : null }),
        ...(humidityIn    !== undefined && { humidityIn:    humidityIn    ? parseFloat(humidityIn)    : null }),
        ...(humidityOut   !== undefined && { humidityOut:   humidityOut   ? parseFloat(humidityOut)   : null }),
        ...(moldPercent   !== undefined && { moldPercent:   moldPercent   ? parseFloat(moldPercent)   : null }),
        ...(splitPercent  !== undefined && { splitPercent:  splitPercent  ? parseFloat(splitPercent)  : null }),
        ...(phenolPercent !== undefined && { phenolPercent: phenolPercent ? parseFloat(phenolPercent) : null }),
        ...(pocketPercent !== undefined && { pocketPercent: pocketPercent ? parseFloat(pocketPercent) : null }),
        ...(metalDetResult !== undefined && { metalDetResult }),
        ...(boxCount      !== undefined && { boxCount:      boxCount      ? parseInt(boxCount)        : null }),
        ...(notes         !== undefined && { notes }),
        ...(documents     !== undefined && { documents }),
        ...(status        !== undefined && { status }),
        ...(isConform     !== undefined && { isConform }),
        ...(startedAt     && { startedAt:   new Date(startedAt)   }),
        ...(completedAt   && { completedAt: new Date(completedAt) }),
        // Nouveaux champs
        ...(temperature    !== undefined && { temperature:    temperature    ? parseFloat(temperature)    : null }),
        ...(vanillineRate  !== undefined && { vanillineRate:  vanillineRate  ? parseFloat(vanillineRate)  : null }),
        ...(classification !== undefined && { classification }),
        ...(isFendue       !== undefined && { isFendue:       isFendue !== null ? Boolean(isFendue)        : null }),
        ...(bundleType     !== undefined && { bundleType }),
        ...(bundleCount    !== undefined && { bundleCount:    bundleCount    ? parseInt(bundleCount)       : null }),
      },
    });

    return res.json({ success: true, data: updated, message: 'Étape mise à jour' });
  } catch (err) { next(err); }
};

export const validateStep = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isConform, notes } = req.body;
    const validatorEmail = req.user?.email || 'responsable';

    const step = await prisma.conditioningStep.findUnique({
      where: { id: req.params.stepId },
      include: { order: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });
    if (!step) return res.status(404).json({ success: false, message: 'Étape introuvable' });

    await prisma.conditioningStep.update({
      where: { id: req.params.stepId },
      data: {
        isConform,
        validatedBy: validatorEmail,
        validatedAt: new Date(),
        status: 'termine',
        completedAt: new Date(),
        ...(notes && { notes }),
      },
    });

    if (isConform) {
      const nextStep = step.order.steps.find((s) => s.stepOrder === step.stepOrder + 1);
      if (nextStep) {
        await prisma.conditioningStep.update({
          where: { id: nextStep.id },
          data: { status: 'en_cours', startedAt: new Date() },
        });
      } else {
        await prisma.conditioningOrder.update({
          where: { id: step.orderId },
          data: { status: 'termine' },
        });
      }
    } else {
      await prisma.conditioningOrder.update({
        where: { id: step.orderId },
        data: { status: 'non_conforme' },
      });
    }

    const updated = await prisma.conditioningOrder.findUnique({
      where: { id: step.orderId },
      include: {
        lot: { include: { product: true, producer: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    return res.json({ success: true, data: updated, message: isConform ? 'Étape validée' : 'Étape non conforme' });
  } catch (err) { next(err); }
};

export const getNorms = (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      vanille_noire:    { min: 36, max: 38, label: '36–38%' },
      vanille_rouge_us: { min: 25, max: 28, label: '25–28% (US)' },
      vanille_rouge_eu: { min: 28, max: 32, label: '28–32% (EU)' },
      echaudage:        { tempMin: 60, tempMax: 65, label: '60–65°C' },
      etuvage:          { durationH: 48, label: '48 heures' },
      vanilline:        { min: 1.5, label: '≥ 1.5%' },
    },
  });
};

export const getStepTemplates = (_req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: STEPS });
};
