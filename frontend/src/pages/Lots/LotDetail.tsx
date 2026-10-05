import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Scale, Calendar, Plus, QrCode, BarChart2,
  Package, ClipboardList, Ship, CheckCircle, Clock, Factory,
  Leaf, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { QRCodeManager } from '../../components/qr/QRCodeManager';
import { ScanAnalyticsDashboard } from '../../components/qr/ScanAnalyticsDashboard';
import { AntifraudPanel } from '../../components/qr/AntifraudPanel';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, ScoreBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { LOT_STATUS_CONFIG, formatDate, formatKg, cn } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { LotWorkflow } from './workflow/LotWorkflow';
import { LotStockEntry } from './workflow/LotStockEntry';

// ─── Hook compteur animé ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    const timeout = setTimeout(() => {
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setValue(target); clearInterval(timer); }
        else setValue(Math.floor(start));
      }, 16);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

// ─── Hook intersection observer (animation au scroll) ────────────────────────
function useVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Barre de répartition animée ─────────────────────────────────────────────
const LotQuantityBar: React.FC<{ lot: any }> = ({ lot }) => {
  const { ref, visible } = useVisible();
  const total     = lot.quantityKg || 0;
  const available = lot.availableKg ?? total;
  const reserved  = Math.max(0, total - available);
  const availPct  = total ? (available / total) * 100 : 100;
  const resPct    = total ? (reserved  / total) * 100 : 0;

  const animTotal = useCountUp(total,     900, 200);
  const animRes   = useCountUp(reserved,  900, 350);
  const animAvail = useCountUp(available, 900, 500);

  const isLow      = available > 0 && available < total * 0.2;
  const isExhausted = available <= 0;

  return (
    <div ref={ref} className="p-4 rounded-[8px] border transition-all duration-300 bg-[#FFFCF6] border-[#D8CEC4]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#70656B]">
          Répartition des volumes
        </p>
        {isExhausted && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#F8E6E8] text-[#963C47]">
            ⚠ Lot épuisé
          </span>
        )}
        {isLow && !isExhausted && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#F5E8CC] text-[#795015]">
            ▲ Stock faible ({Math.round(availPct)}%)
          </span>
        )}
      </div>

      {/* Barre claire */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-[#EAE2EB]">
        <div className="h-full transition-all duration-1000 ease-out bg-[#AD5138]"
          style={{
            width: visible ? `${resPct}%` : '0%',
            borderRadius: resPct === 100 ? '9999px' : '9999px 0 0 9999px',
          }} />
        <div className="h-full transition-all duration-1000 ease-out bg-[#435432]"
          style={{
            width: visible ? `${availPct}%` : '0%',
            transitionDelay: '150ms',
            borderRadius: resPct === 0 ? '9999px' : '0 9999px 9999px 0',
          }} />
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Total initial', value: animTotal, color: 'text-[#352638]' },
          { label: 'Réservé / En cours', value: animRes, color: 'text-[#AD5138]' },
          { label: 'Disponible', value: animAvail, color: isExhausted ? 'text-[#963C47]' : isLow ? 'text-[#795015]' : 'text-[#435432]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-2.5 rounded-[6px] bg-[#F5F0E7]">
            <p className={cn('text-lg font-serif font-medium tabular-nums', color)}>
              {value.toLocaleString('fr-FR')} <span className="text-xs font-sans font-normal text-[#70656B]">kg</span>
            </p>
            <p className="text-[11px] font-semibold text-[#70656B] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Config icônes timeline ───────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  created:              { icon: Leaf,          color: '#435432', bg: '#E5ECD9', label: 'Lot créé' },
  po_created:           { icon: ClipboardList, color: '#AD5138', bg: '#F5E8CC', label: 'Bon de commande' },
  conditioning_started: { icon: Factory,       color: '#352638', bg: '#EAE2EB', label: 'Conditionnement démarré' },
  conditioning_done:    { icon: CheckCircle,   color: '#435432', bg: '#E5ECD9', label: 'Conditionnement terminé' },
  shipped:              { icon: Ship,          color: '#352638', bg: '#EAE2EB', label: 'Expédié' },
  delivered:            { icon: CheckCircle,   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'Livré' },
  split:                { icon: Package,       color: '#fb923c', bg: 'rgba(245,158,11,0.12)',  label: 'Sous-lot créé' },
  step:                 { icon: Clock,         color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'Étape de transformation' },
  default:              { icon: Clock,         color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: 'Événement' },
};

// ─── Un élément de timeline ───────────────────────────────────────────────────
const TimelineItem: React.FC<{ event: any; isLast: boolean; index: number }> = ({ event, isLast, index }) => {
  const [expanded, setExpanded] = useState(false);
  const { ref, visible } = useVisible(0.05);
  const cfg = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.default;
  const IconComp = cfg.icon;

  return (
    <div ref={ref} className="flex gap-3 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-20px)',
        transitionDelay: `${Math.min(index * 60, 400)}ms`,
      }}>
      {/* Ligne + icône */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-default"
          style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}50`, boxShadow: `0 0 8px ${cfg.color}20` }}>
          <IconComp size={14} style={{ color: cfg.color }} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 my-1 transition-all duration-700"
            style={{ background: visible ? `linear-gradient(${cfg.color}40, rgba(255,255,255,0.04))` : 'transparent', minHeight: 16 }} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2 cursor-pointer group"
          onClick={() => event.extra && setExpanded(e => !e)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              {event.quantityKg != null && (
                <span className="text-xs px-1.5 py-0.5 rounded font-mono transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-navy-200)' }}>
                  {Number(event.quantityKg).toLocaleString()} kg
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-navy-300)' }}>
              {event.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs" style={{ color: 'var(--color-navy-500)' }}>
              {new Date(event.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {event.extra && (
              <span style={{ color: 'var(--color-navy-500)' }}>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            )}
          </div>
        </div>

        {/* Détails expandés avec animation */}
        <div className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: expanded ? '200px' : '0px', opacity: expanded ? 1 : 0 }}>
          {event.extra && (
            <div className="mt-2 p-3 rounded-lg text-xs space-y-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {event.relatedType === 'conditioning' && (
                <>
                  <p style={{ color: 'var(--color-navy-300)' }}>Statut : <span className="font-medium text-white">{event.extra.status}</span></p>
                  <p style={{ color: 'var(--color-navy-300)' }}>Type : <span className="font-medium text-white">{event.extra.productType === 'vanille_noire' ? '🖤 Vanille Noire' : '🔴 Vanille Rouge'}</span></p>
                  {event.extra.destination && <p style={{ color: 'var(--color-navy-300)' }}>Destination : <span className="font-medium text-white">{event.extra.destination.toUpperCase()}</span></p>}
                </>
              )}
              {event.relatedType === 'shipment' && (
                <>
                  <p style={{ color: 'var(--color-navy-300)' }}>Réf. : <span className="font-mono font-medium text-blue-400">{event.extra.reference}</span></p>
                  <p style={{ color: 'var(--color-navy-300)' }}>Transporteur : <span className="font-medium text-white">{event.extra.carrierName}</span></p>
                  <p style={{ color: 'var(--color-navy-300)' }}>Destination : <span className="font-medium text-white">{event.extra.arrivalLocation}</span></p>
                  {event.extra.expectedArrival && <p style={{ color: 'var(--color-navy-300)' }}>Arrivée prévue : <span className="font-medium text-white">{formatDate(event.extra.expectedArrival)}</span></p>}
                </>
              )}
              {event.relatedType === 'step' && (
                <>
                  {event.extra.operatorName && <p style={{ color: 'var(--color-navy-300)' }}>Opérateur : <span className="font-medium text-white">{event.extra.operatorName}</span></p>}
                  {event.extra.location && <p style={{ color: 'var(--color-navy-300)' }}>Lieu : <span className="font-medium text-white">{event.extra.location}</span></p>}
                  {event.extra.inputQuantity && <p style={{ color: 'var(--color-navy-300)' }}>Entrée : <span className="font-medium text-white">{event.extra.inputQuantity} kg</span></p>}
                  {event.extra.outputQuantity && <p style={{ color: 'var(--color-navy-300)' }}>Sortie : <span className="font-medium text-white">{event.extra.outputQuantity} kg</span></p>}
                  {event.extra.notes && <p style={{ color: 'var(--color-navy-300)' }}>{event.extra.notes}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Timeline complète ────────────────────────────────────────────────────────
const LotTimeline: React.FC<{ lot: any; events: any[] }> = ({ lot, events }) => {
  const allEvents = [
    // 1. Création du lot
    {
      id: 'lot-created',
      eventType: 'created',
      description: `${lot.quantityKg} kg · ${lot.producer?.name} · ${lot.producer?.region}`,
      quantityKg: lot.quantityKg,
      createdAt: lot.createdAt,
      extra: null,
    },
    // 2. Étapes de transformation
    ...(lot.processingSteps ?? []).map((s: any) => ({
      id: `step-${s.id}`,
      eventType: 'step',
      description: `Étape ${s.stepOrder} : ${s.stepName}${s.operatorName ? ` · ${s.operatorName}` : ''}`,
      quantityKg: s.outputQuantity ?? s.inputQuantity ?? null,
      createdAt: s.startedAt,
      relatedType: 'step',
      extra: s,
    })),
    // 3. Événements BDD (PO, sous-lots...)
    ...events,
    // 4. Conditionnements
    ...(lot.conditioningOrders ?? []).map((co: any) => ({
      id: `cond-${co.id}`,
      eventType: co.status === 'termine' ? 'conditioning_done' : 'conditioning_started',
      description: `Conditionnement #${co.passNumber}${co.quantityKg ? ` — ${co.quantityKg} kg` : ''} · ${co.productType === 'vanille_noire' ? '🖤 Noire' : '🔴 Rouge'}`,
      quantityKg: co.quantityKg,
      createdAt: co.createdAt,
      relatedType: 'conditioning',
      extra: co,
    })),
    // 5. Expéditions
    ...(lot.shipmentLots ?? []).map((sl: any) => ({
      id: `ship-${sl.shipment?.id}`,
      eventType: sl.shipment?.status === 'delivered' ? 'delivered' : 'shipped',
      description: `${sl.shipment?.reference} · ${sl.shipment?.departureLocation} → ${sl.shipment?.arrivalLocation}`,
      quantityKg: null,
      createdAt: sl.shipment?.departureDate || sl.createdAt,
      relatedType: 'shipment',
      extra: sl.shipment,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (allEvents.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--color-navy-400)' }}>Aucun événement enregistré</p>;
  }

  return (
    <div className="space-y-0">
      {allEvents.map((event, idx) => (
        <TimelineItem key={event.id} event={event} isLast={idx === allEvents.length - 1} index={idx} />
      ))}
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
export const LotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [stepModal, setStepModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'stock'>('overview');
  const [step, setStep] = useState({
    stepName: '', stepOrder: 1, startedAt: '', operatorName: '',
    location: '', inputQuantity: '', outputQuantity: '', qualityScore: '', notes: '',
  });

  // Animation d'entrée header
  const [headerVisible, setHeaderVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeaderVisible(true), 50); return () => clearTimeout(t); }, []);

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => api.get(`/lots/${id}`).then((r) => r.data.data),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['lot-events', id],
    queryFn: () => api.get(`/lots/${id}/history`).then(r => r.data.data).catch(() => []),
    enabled: !!id,
  });

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/lots/${id}/steps`, {
        ...step,
        stepOrder: parseInt(step.stepOrder as any),
        startedAt: new Date(step.startedAt).toISOString(),
        inputQuantity:  step.inputQuantity  ? parseFloat(step.inputQuantity)  : undefined,
        outputQuantity: step.outputQuantity ? parseFloat(step.outputQuantity) : undefined,
        qualityScore:   step.qualityScore   ? parseFloat(step.qualityScore)   : undefined,
      });
      toast.success('Étape ajoutée');
      setStepModal(false);
      qc.invalidateQueries({ queryKey: ['lot', id] });
      qc.invalidateQueries({ queryKey: ['lot-events', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (isLoading || !lot) return <PageLoader />;

  return (
    <div className="flex flex-col min-h-full">

      {/* Header avec animation slide-down */}
      <Header>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/lots')} icon={<ArrowLeft size={16} />}>Retour</Button>
          <div>
            <h1 className="font-mono text-lg font-bold text-[#352638]">{lot.lotNumber}</h1>
            <p className="text-xs text-[#70656B]">{lot.product?.name} · {lot.producer?.name}</p>
          </div>
          <StatusBadge config={LOT_STATUS_CONFIG[lot.status] || { label: lot.status }} />
        </div>
      </Header>

      {/* Tab navigation */}
      <div className="flex border-b px-6 bg-[#FFFCF6] border-[#D8CEC4]">
        {([
          { key: 'overview',  label: "Vue d'ensemble" },
          { key: 'workflow',  label: 'Processus de réception' },
          { key: 'stock',     label: 'Entrée stock' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === key
                ? 'border-[#AD5138] text-[#352638] bg-[#EAE2EB]/40'
                : 'border-transparent text-[#70656B] hover:text-[#352638]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Infos + barre de répartition */}
          <Card className="transition-all duration-500"
            style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(16px)', transitionDelay: '100ms' }}>
            <CardHeader title="Informations du lot" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Quantité récoltée</p>
                  <p className="font-medium text-white">{formatKg(lot.quantityKg)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Date de récolte</p>
                  <p className="font-medium text-white">{formatDate(lot.harvestDate)}</p>
                </div>
              </div>
              {lot.harvestLatitude && lot.harvestLongitude && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Position GPS</p>
                    <p className="font-mono text-xs text-white">{lot.harvestLatitude.toFixed(4)}, {lot.harvestLongitude.toFixed(4)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Score qualité</p>
                <ScoreBadge score={lot.qualityScore} />
              </div>
            </div>

            {/* Barre de répartition animée */}
            <LotQuantityBar lot={lot} />

            {lot.notes && <p className="mt-3 text-sm text-gray-400 bg-white/5 rounded-lg p-3">{lot.notes}</p>}
          </Card>

          {/* Timeline / Historique */}
          <Card className="transition-all duration-500"
            style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: '200ms' }}>
            <CardHeader
              title="📋 Historique du lot"
              subtitle="Traçabilité complète — de la récolte à la livraison"
              action={
                <Button size="sm" onClick={() => setStepModal(true)} icon={<Plus size={14} />}>
                  + Étape
                </Button>
              }
            />
            <LotTimeline lot={lot} events={eventsData ?? []} />
          </Card>
        </div>

        {/* ── Sidebar droite ── */}
        <div className="space-y-4">
          {[
            {
              delay: '150ms',
              content: (
                <Card>
                  <CardHeader title="Producteur" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-white">{lot.producer?.name}</p>
                    <p className="text-gray-500">📍 {lot.producer?.region}, {lot.producer?.country}</p>
                    <Button variant="secondary" size="sm" className="w-full justify-center mt-2"
                      onClick={() => navigate(`/producers/${lot.producerId}`)}>
                      Voir le profil
                    </Button>
                  </div>
                </Card>
              ),
            },
            {
              delay: '250ms',
              content: (
                <Card>
                  <CardHeader title="QR Code" subtitle="Passeport numérique" icon={<QrCode size={15} />} />
                  <QRCodeManager lotId={lot.id} lotNumber={lot.lotNumber} qrCodeUrl={lot.qrCodeUrl} />
                </Card>
              ),
            },
            {
              delay: '350ms',
              content: (
                <Card>
                  <CardHeader title="Analytics" subtitle="Statistiques de scan" icon={<BarChart2 size={15} />} />
                  <ScanAnalyticsDashboard lotId={lot.id} />
                </Card>
              ),
            },
            {
              delay: '450ms',
              content: (
                <Card>
                  <CardHeader title="Anti-Contrefaçon" subtitle="Surveillance active" icon={<Shield size={15} />} />
                  <AntifraudPanel lotId={lot.id} />
                </Card>
              ),
            },
            ...(lot.shipmentLots?.length > 0 ? [{
              delay: '550ms',
              content: (
                <Card>
                  <CardHeader title="Expéditions" />
                  <div className="space-y-2">
                    {lot.shipmentLots.map((sl: any) => (
                      <div key={sl.shipment.id}
                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => navigate(`/shipments/${sl.shipment.id}`)}>
                        <span className="font-mono text-xs text-blue-400">{sl.shipment.reference}</span>
                        <span className="text-gray-500 text-xs">{sl.shipment.status}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ),
            }] : []),
          ].map(({ delay, content }, i) => (
            <div key={i} className="transition-all duration-500"
              style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: delay }}>
              {content}
            </div>
          ))}
        </div>
      </div>
      )}
      {activeTab === 'workflow' && (
        <div className="flex-1 p-6">
          <LotWorkflow lotId={lot.id} />
        </div>
      )}
      {activeTab === 'stock' && (
        <div className="flex-1 p-6">
          <LotStockEntry lotId={lot.id} />
        </div>
      )}

      {/* Modal ajouter étape */}
      <Modal open={stepModal} onClose={() => setStepModal(false)} title="Ajouter une étape" size="md">
        <form onSubmit={addStep} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom de l'étape *</label>
              <input className="input" placeholder="ex: Blanchiment" value={step.stepName}
                onChange={(e) => setStep((s) => ({ ...s, stepName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Ordre</label>
              <input type="number" className="input" value={step.stepOrder}
                onChange={(e) => setStep((s) => ({ ...s, stepOrder: parseInt(e.target.value) }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Date de début *</label>
            <input type="datetime-local" className="input" value={step.startedAt}
              onChange={(e) => setStep((s) => ({ ...s, startedAt: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Opérateur</label>
              <input className="input" placeholder="Nom" value={step.operatorName}
                onChange={(e) => setStep((s) => ({ ...s, operatorName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Lieu</label>
              <input className="input" placeholder="Lieu" value={step.location}
                onChange={(e) => setStep((s) => ({ ...s, location: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Qté entrée (kg)</label>
              <input type="number" step="0.1" className="input" value={step.inputQuantity}
                onChange={(e) => setStep((s) => ({ ...s, inputQuantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Qté sortie (kg)</label>
              <input type="number" step="0.1" className="input" value={step.outputQuantity}
                onChange={(e) => setStep((s) => ({ ...s, outputQuantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Score qualité</label>
              <input type="number" step="0.1" min="0" max="10" className="input" placeholder="0-10"
                value={step.qualityScore} onChange={(e) => setStep((s) => ({ ...s, qualityScore: e.target.value }))} />
            </div>
          </div>
          <textarea className="input h-16 resize-none" placeholder="Notes..." value={step.notes}
            onChange={(e) => setStep((s) => ({ ...s, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStepModal(false)}>Annuler</Button>
            <Button type="submit">Ajouter l'étape</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
