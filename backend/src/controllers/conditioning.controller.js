
const prisma = require('../config/database')

// Définition des étapes par type de produit
const STEPS = {
  vanille_noire: [
    { stepOrder: 1, stepName: 'Reception', phase: 'triage', docs: ['FICHE DE PESAGE', 'FICHE ENTREE STOCK'] },
    { stepOrder: 2, stepName: 'Sechage', phase: 'triage', docs: [], conditional: true },
    { stepOrder: 3, stepName: 'Triage et mesurage', phase: 'triage', docs: ['CHECK LIST CONTROLE PRODUCTION'] },
    { stepOrder: 4, stepName: 'Mise en sachet sous-vide', phase: 'conditionnement', docs: ['CHECK LIST CONDITIONNEMENT'] },
    { stepOrder: 5, stepName: 'Detecteur de metal', phase: 'conditionnement', docs: [] },
    { stepOrder: 6, stepName: 'Mise en carton', phase: 'conditionnement', docs: [] },
    { stepOrder: 7, stepName: 'Transfert stock fini', phase: 'conditionnement', docs: ['FICHE SORTIE STOCK'] },
  ],
  vanille_rouge: [
    { stepOrder: 1, stepName: 'Reception', phase: 'triage', docs: ['FICHE DE PESAGE', 'FICHE ENTREE STOCK'] },
    { stepOrder: 2, stepName: 'Sechage', phase: 'triage', docs: [], conditional: true },
    { stepOrder: 3, stepName: 'Triage et mesurage', phase: 'triage', docs: ['CHECK LIST CONTROLE PRODUCTION'] },
    { stepOrder: 4, stepName: 'Mise en sachet sous-vide', phase: 'conditionnement', docs: ['CHECK LIST CONDITIONNEMENT'] },
    { stepOrder: 5, stepName: 'Detecteur de metal', phase: 'conditionnement', docs: [] },
    { stepOrder: 6, stepName: 'Mise en carton', phase: 'conditionnement', docs: [] },
    { stepOrder: 7, stepName: 'Transfert stock fini', phase: 'conditionnement', docs: ['FICHE SORTIE STOCK'] },
  ],
}

const HUMIDITY_NORMS = {
  vanille_noire: { min: 36, max: 38, label: '36-38%' },
  vanille_rouge_us: { min: 25, max: 28, label: '25-28% (US)' },
  vanille_rouge_eu: { min: 28, max: 32, label: '28-32% (EU)' },
}

// GET /api/conditioning — dashboard + liste
exports.getOrders = async (req, res, next) => {
  try {
    const { status, productType, lotId } = req.query
    const where = {}
    if (status) where.status = status
    if (productType) where.productType = productType
    if (lotId) where.lotId = lotId

    const [orders, stats] = await Promise.all([
      prisma.conditioningOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          lot: { include: { product: true, producer: true } },
          steps: { orderBy: { stepOrder: 'asc' } }
        }
      }),
      prisma.conditioningOrder.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ])

    const statsMap = {}
    stats.forEach(s => { statsMap[s.status] = s._count.id })

    return res.json({ success: true, data: orders, stats: statsMap })
  } catch (err) { next(err) }
}

// GET /api/conditioning/:id
exports.getOrder = async (req, res, next) => {
  try {
    const order = await prisma.conditioningOrder.findUnique({
      where: { id: req.params.id },
      include: {
        lot: { include: { product: true, producer: true } },
        steps: { orderBy: { stepOrder: 'asc' } }
      }
    })
    if (!order) return res.status(404).json({ success: false, message: 'Ordre introuvable' })
    return res.json({ success: true, data: order })
  } catch (err) { next(err) }
}

// POST /api/conditioning — créer un ordre
exports.createOrder = async (req, res, next) => {
  try {
    const { lotId, productType, destination, passNumber } = req.body
    if (!lotId || !productType) return res.status(400).json({ success: false, message: 'lotId et productType requis' })

    const stepTemplates = STEPS[productType]
    if (!stepTemplates) return res.status(400).json({ success: false, message: 'Type de produit inconnu' })

    const lot = await prisma.lot.findUnique({ where: { id: lotId } })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot introuvable' })

    // Compter les passages existants
    const existingCount = await prisma.conditioningOrder.count({ where: { lotId } })

    const order = await prisma.conditioningOrder.create({
      data: {
        lotId,
        productType,
        destination: destination || null,
        passNumber: passNumber || existingCount + 1,
        createdBy: req.user?.email || 'system',
        status: 'en_cours',
        steps: {
          create: stepTemplates.map(s => ({
            stepOrder: s.stepOrder,
            stepName: s.stepName,
            status: s.stepOrder === 1 ? 'en_cours' : 'en_attente',
            documents: s.docs
          }))
        }
      },
      include: {
        lot: { include: { product: true, producer: true } },
        steps: { orderBy: { stepOrder: 'asc' } }
      }
    })

    return res.status(201).json({ success: true, data: order, message: 'Ordre de conditionnement cree' })
  } catch (err) { next(err) }
}

// PUT /api/conditioning/:id/steps/:stepId — mettre à jour une étape
exports.updateStep = async (req, res, next) => {
  try {
    const {
      operatorName, quantityIn, quantityOut,
      humidityIn, humidityOut,
      moldPercent, splitPercent, phenolPercent, pocketPercent,
      metalDetResult, boxCount, notes, documents,
      status, isConform, startedAt, completedAt
    } = req.body

    const step = await prisma.conditioningStep.findUnique({
      where: { id: req.params.stepId },
      include: { order: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } }
    })
    if (!step) return res.status(404).json({ success: false, message: 'Etape introuvable' })

    const updated = await prisma.conditioningStep.update({
      where: { id: req.params.stepId },
      data: {
        operatorName, quantityIn, quantityOut,
        humidityIn, humidityOut,
        moldPercent, splitPercent, phenolPercent, pocketPercent,
        metalDetResult, boxCount, notes,
        documents: documents || undefined,
        status: status || undefined,
        isConform: isConform !== undefined ? isConform : undefined,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      }
    })

    return res.json({ success: true, data: updated, message: 'Etape mise a jour' })
  } catch (err) { next(err) }
}

// POST /api/conditioning/:id/steps/:stepId/validate — validation qualité
exports.validateStep = async (req, res, next) => {
  try {
    const { isConform, notes } = req.body
    const validatorEmail = req.user?.email || 'responsable'

    const step = await prisma.conditioningStep.findUnique({
      where: { id: req.params.stepId },
      include: { order: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } }
    })
    if (!step) return res.status(404).json({ success: false, message: 'Etape introuvable' })

    // Valider l'étape
    await prisma.conditioningStep.update({
      where: { id: req.params.stepId },
      data: {
        isConform,
        validatedBy: validatorEmail,
        validatedAt: new Date(),
        status: 'termine',
        notes: notes || step.notes,
        completedAt: new Date(),
      }
    })

    // Si conforme, activer l'étape suivante
    if (isConform) {
      const nextStep = step.order.steps.find(s => s.stepOrder === step.stepOrder + 1)
      if (nextStep) {
        await prisma.conditioningStep.update({
          where: { id: nextStep.id },
          data: { status: 'en_cours', startedAt: new Date() }
        })
      } else {
        // Toutes les étapes terminées
        await prisma.conditioningOrder.update({
          where: { id: step.orderId },
          data: { status: 'termine' }
        })
      }
    } else {
      // Non conforme — retour séchage si c'est humidité
      await prisma.conditioningOrder.update({
        where: { id: step.orderId },
        data: { status: 'non_conforme' }
      })
    }

    const updated = await prisma.conditioningOrder.findUnique({
      where: { id: step.orderId },
      include: { lot: { include: { product: true, producer: true } }, steps: { orderBy: { stepOrder: 'asc' } } }
    })

    return res.json({ success: true, data: updated, message: isConform ? 'Etape validee' : 'Etape non conforme' })
  } catch (err) { next(err) }
}

// GET /api/conditioning/norms — normes par produit
exports.getNorms = async (req, res) => {
  return res.json({ success: true, data: HUMIDITY_NORMS })
}

exports.getStepTemplates = async (req, res) => {
  return res.json({ success: true, data: STEPS })
}
