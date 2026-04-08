import { prisma } from '../../utils/prisma';
import { differenceInDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  category: string;
  title: string;
  message: string;
  value?: number | string;
  entityId?: string;
  entityType?: string;
  priority: number; // 1 = high, 2 = medium, 3 = low
}

export interface Anomaly {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  lotId?: string;
  lotNumber?: string;
  producerId?: string;
  producerName?: string;
  description: string;
  detectedAt: Date;
}

export class IntelligenceService {

  // ─── INSIGHTS ENGINE ──────────────────────────────────────────────────
  async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const now = new Date();

    // 1. Certifications expirantes
    const expiringSoon = await prisma.certification.findMany({
      where: {
        status: 'active',
        expiresAt: { lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
      },
      include: { producer: { select: { name: true } } },
    });

    const critical = expiringSoon.filter(c => differenceInDays(c.expiresAt, now) <= 7);
    const warning = expiringSoon.filter(c => differenceInDays(c.expiresAt, now) > 7 && differenceInDays(c.expiresAt, now) <= 30);

    if (critical.length > 0) {
      insights.push({
        type: 'danger',
        category: 'certification',
        title: `🚨 ${critical.length} certification(s) expirent dans 7 jours`,
        message: critical.map(c => `${c.producer.name} — ${c.type}`).join(', '),
        priority: 1,
      });
    }
    if (warning.length > 0) {
      insights.push({
        type: 'warning',
        category: 'certification',
        title: `⚠️ ${warning.length} certification(s) expirent dans 30 jours`,
        message: warning.map(c => `${c.producer.name} — ${c.type}`).join(', '),
        priority: 2,
      });
    }

    // 2. Lots bloqués (sans mise à jour depuis > 7 jours en status processing)
    const stuckLots = await prisma.lot.findMany({
      where: {
        status: { in: ['processing', 'harvest'] },
        updatedAt: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { producer: { select: { name: true } }, product: { select: { name: true } } },
    });
    if (stuckLots.length > 0) {
      insights.push({
        type: 'warning',
        category: 'lot',
        title: `⏸️ ${stuckLots.length} lot(s) sans activité depuis 7+ jours`,
        message: stuckLots.slice(0, 3).map(l => l.lotNumber).join(', ') + (stuckLots.length > 3 ? `... +${stuckLots.length - 3}` : ''),
        priority: 2,
      });
    }

    // 3. Expéditions en retard
    const lateShipments = await prisma.shipment.findMany({
      where: {
        status: 'in_transit',
        expectedArrival: { lte: now },
      },
    });
    if (lateShipments.length > 0) {
      insights.push({
        type: 'danger',
        category: 'shipment',
        title: `🚢 ${lateShipments.length} expédition(s) en retard`,
        message: lateShipments.map(s => s.reference).join(', '),
        priority: 1,
      });
    }

    // 4. Meilleur producteur du mois
    const lastMonth = subMonths(now, 1);
    const topLots = await prisma.lot.findMany({
      where: {
        createdAt: { gte: startOfMonth(lastMonth), lte: endOfMonth(lastMonth) },
        qualityScore: { not: null },
      },
      include: { producer: { select: { name: true } } },
    });
    if (topLots.length > 0) {
      const byProducer = topLots.reduce((acc: any, lot) => {
        const name = lot.producer.name;
        if (!acc[name]) acc[name] = { sum: 0, count: 0 };
        acc[name].sum += lot.qualityScore || 0;
        acc[name].count++;
        return acc;
      }, {});
      const best = Object.entries(byProducer).sort((a: any, b: any) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))[0];
      if (best) {
        const avg = (best[1] as any).sum / (best[1] as any).count;
        insights.push({
          type: 'success',
          category: 'quality',
          title: `🏆 Meilleur producteur : ${best[0]}`,
          message: `Score qualité moyen de ${avg.toFixed(1)}/10 le mois dernier`,
          value: avg.toFixed(1),
          priority: 3,
        });
      }
    }

    // 5. Volume tendance
    const thisMonth = await prisma.lot.count({ where: { createdAt: { gte: startOfMonth(now) } } });
    const prevMonth = await prisma.lot.count({
      where: { createdAt: { gte: startOfMonth(lastMonth), lte: endOfMonth(lastMonth) } },
    });
    if (prevMonth > 0) {
      const diff = ((thisMonth - prevMonth) / prevMonth) * 100;
      if (Math.abs(diff) > 10) {
        insights.push({
          type: diff > 0 ? 'success' : 'info',
          category: 'volume',
          title: diff > 0 ? `📈 Volume en hausse de ${diff.toFixed(0)}%` : `📉 Volume en baisse de ${Math.abs(diff).toFixed(0)}%`,
          message: `${thisMonth} lots ce mois vs ${prevMonth} le mois dernier`,
          value: `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`,
          priority: 3,
        });
      }
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }

  // ─── ANOMALY DETECTION ──────────────────────────────────────────────
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const now = new Date();

    // 1. Perte de poids anormale entre étapes (> 30%)
    const steps = await prisma.processingStep.findMany({
      where: {
        inputQuantity: { not: null },
        outputQuantity: { not: null },
      },
      include: { lot: { select: { lotNumber: true, producerId: true } } },
    });
    steps.forEach((step) => {
      if (step.inputQuantity && step.outputQuantity) {
        const loss = (step.inputQuantity - step.outputQuantity) / step.inputQuantity;
        if (loss > 0.35) {
          anomalies.push({
            type: 'weight_loss',
            severity: 'warning',
            lotId: step.lotId,
            lotNumber: step.lot.lotNumber,
            description: `Perte de poids de ${(loss * 100).toFixed(1)}% à l'étape "${step.stepName}" (seuil: 35%)`,
            detectedAt: now,
          });
        }
      }
    });

    // 2. Score qualité anormalement bas (< 4)
    const lowQualityLots = await prisma.lot.findMany({
      where: { qualityScore: { lt: 4, not: null } },
      include: { producer: { select: { name: true } } },
    });
    lowQualityLots.forEach((lot) => {
      anomalies.push({
        type: 'low_quality',
        severity: 'critical',
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        producerName: lot.producer.name,
        description: `Score qualité très bas : ${lot.qualityScore}/10`,
        detectedAt: now,
      });
    });

    // 3. Lots exportés sans expédition
    const orphanLots = await prisma.lot.findMany({
      where: {
        status: 'exported',
        shipmentLots: { none: {} },
      },
    });
    orphanLots.forEach((lot) => {
      anomalies.push({
        type: 'orphan_lot',
        severity: 'warning',
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        description: `Lot marqué "exporté" sans expédition associée`,
        detectedAt: now,
      });
    });

    return anomalies;
  }

  // ─── TRENDS & ANALYTICS ─────────────────────────────────────────────
  async getTrends() {
    const now = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, start: startOfMonth(d), end: endOfMonth(d) });
    }

    const trendData = await Promise.all(
      months.map(async (m) => {
        const [total, exported, avgQuality] = await Promise.all([
          prisma.lot.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
          prisma.lot.count({ where: { status: 'exported', updatedAt: { gte: m.start, lte: m.end } } }),
          prisma.lot.aggregate({ where: { createdAt: { gte: m.start, lte: m.end }, qualityScore: { not: null } }, _avg: { qualityScore: true } }),
        ]);
        return { month: m.label, total, exported, avgQuality: avgQuality._avg.qualityScore || 0 };
      })
    );

    return trendData;
  }

  // ─── TOP PRODUCERS RANKING ──────────────────────────────────────────
  async getProducerRanking() {
    const producers = await prisma.producer.findMany({
      where: { isActive: true },
      include: {
        lots: {
          where: { qualityScore: { not: null } },
          select: { qualityScore: true },
        },
        certifications: { where: { status: 'active' } },
        _count: { select: { lots: true } },
      },
    });

    return producers.map((p) => {
      const scores = p.lots.map((l) => l.qualityScore || 0);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const certBonus = Math.min(p.certifications.length * 0.3, 1.5);
      const finalScore = Math.min(10, avgScore + certBonus);
      return {
        id: p.id,
        name: p.name,
        region: p.region,
        score: Math.round(finalScore * 10) / 10,
        avgQuality: Math.round(avgScore * 10) / 10,
        totalLots: p._count.lots,
        activeCertifications: p.certifications.length,
      };
    }).sort((a, b) => b.score - a.score);
  }

  // ─── AI ASSISTANT ────────────────────────────────────────────────────
  async askAssistant(question: string): Promise<string> {
    const lowerQ = question.toLowerCase();

    // Gather context
    const [totalLots, inTransit, exported, expiringCerts, recentLots] = await Promise.all([
      prisma.lot.count(),
      prisma.lot.count({ where: { status: 'transit' } }),
      prisma.lot.count({ where: { status: 'exported' } }),
      prisma.certification.count({ where: { status: 'active', expiresAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.lot.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { producer: { select: { name: true } }, product: { select: { name: true } } } }),
    ]);

    // Smart rule-based responses
    if (lowerQ.includes('transit') || lowerQ.includes('en cours')) {
      return `📦 Il y a actuellement **${inTransit} lot(s) en transit**. Sur un total de ${totalLots} lots, ${exported} ont déjà été exportés avec succès.`;
    }
    if (lowerQ.includes('certif') && (lowerQ.includes('expir') || lowerQ.includes('expire'))) {
      return `⚠️ **${expiringCerts} certification(s)** expirent dans les 30 prochains jours. Rendez-vous dans le module Documents pour voir le détail.`;
    }
    if (lowerQ.includes('récent') || lowerQ.includes('dernier') || lowerQ.includes('nouveaux')) {
      const list = recentLots.map(l => `• **${l.lotNumber}** — ${l.product.name} (${l.producer.name})`).join('\n');
      return `📋 **5 derniers lots créés :**\n${list}`;
    }
    if (lowerQ.includes('export') && !lowerQ.includes('rapport')) {
      return `✅ **${exported} lots ont été exportés** sur ${totalLots} au total. Taux d'export : ${totalLots > 0 ? ((exported / totalLots) * 100).toFixed(1) : 0}%.`;
    }
    if (lowerQ.includes('producteur') && lowerQ.includes('meilleur')) {
      const ranking = await this.getProducerRanking();
      if (ranking.length > 0) {
        const top = ranking[0];
        return `🏆 **Meilleur producteur : ${top.name}** avec un score de ${top.score}/10 (qualité moyenne ${top.avgQuality}/10, ${top.totalLots} lots, ${top.activeCertifications} certifications actives).`;
      }
      return 'Pas encore assez de données pour établir un classement.';
    }
    if (lowerQ.includes('anomalie') || lowerQ.includes('problème')) {
      const anomalies = await this.detectAnomalies();
      if (anomalies.length === 0) return '✅ Aucune anomalie détectée. Tout semble en ordre !';
      return `🔍 **${anomalies.length} anomalie(s) détectée(s) :**\n${anomalies.slice(0, 3).map(a => `• ${a.description}`).join('\n')}`;
    }

    // Default: context summary
    return `📊 **Résumé de la plateforme TraceAgro :**
• Total lots : **${totalLots}**
• En transit : **${inTransit}**
• Exportés : **${exported}**
• Certifications à renouveler : **${expiringCerts}** (dans 30 jours)

Posez-moi des questions comme : *"Quels lots sont en transit ?"*, *"Y a-t-il des anomalies ?"*, *"Quel est le meilleur producteur ?"*`;
  }
}

export const intelligenceService = new IntelligenceService();
