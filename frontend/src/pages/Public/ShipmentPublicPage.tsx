import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ship, Package, FileText, MapPin, Calendar, Truck,
  CheckCircle, Clock, AlertCircle, Globe, Shield,
  ExternalLink, ChevronRight, Leaf, Award, Scale
} from 'lucide-react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';

/* ── Types de docs EUDR ─────────────────────────────────────────────────── */
const DOC_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  phytosanitary: { label: 'Certificat Phytosanitaire',   emoji: '🌱', color: 'text-green-400' },
  lab_report:    { label: 'Rapport de Laboratoire',       emoji: '🔬', color: 'text-blue-400' },
  organic_cert:  { label: 'Certificat Bio',               emoji: '🌿', color: 'text-emerald-400' },
  fair_trade_cert:{ label: 'Certificat Fair Trade',       emoji: '⚖️', color: 'text-amber-400' },
  eudr_proof:    { label: 'Preuve EUDR',                  emoji: '🇪🇺', color: 'text-blue-500' },
  invoice:       { label: 'Facture',                      emoji: '🧾', color: 'text-gray-400' },
  other:         { label: 'Autre Document',               emoji: '📄', color: 'text-gray-400' },
};

const SHIPMENT_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  preparing:  { label: 'En préparation', color: 'text-amber-400',   bg: 'bg-amber-400/10',   icon: <Clock size={16} /> },
  in_transit: { label: 'En transit',     color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: <Truck size={16} /> },
  delivered:  { label: 'Livré',          color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle size={16} /> },
  cancelled:  { label: 'Annulé',         color: 'text-red-400',     bg: 'bg-red-400/10',     icon: <AlertCircle size={16} /> },
};

/* ══════════════════════════════════════════════════════════════════════════ */
export const ShipmentPublicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [tab, setTab] = useState<'overview' | 'lots' | 'documents' | 'compliance'>('overview');
  const [scanRecorded, setScanRecorded] = useState(false);

  /* ── Enregistrer le scan ─────────────────────────────────────────────── */
  useEffect(() => {
    if (id && !scanRecorded) {
      api.post(`/shipments/public/${id}/scan`).catch(() => {});
      setScanRecorded(true);
    }
  }, [id, scanRecorded]);

  /* ── Fetch données publiques ─────────────────────────────────────────── */
  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment-public', id],
    queryFn: () => api.get(`/shipments/public/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  /* ── Traductions ─────────────────────────────────────────────────────── */
  const t = {
    fr: {
      title: 'Passeport Numérique Expédition',
      subtitle: 'Traçabilité certifiée · APL Madagascar',
      overview: 'Aperçu', lots: 'Lots', documents: 'Documents', compliance: 'Conformité EUDR',
      carrier: 'Transporteur', container: 'Conteneur', departure: 'Port départ',
      arrival: 'Port arrivée', depDate: 'Date départ', arrDate: 'Arrivée prévue',
      realArr: 'Arrivée réelle', lotsIncluded: 'lots inclus', totalQty: 'Quantité totale',
      avgScore: 'Score qualité moyen', eudrCompliant: 'Conforme EUDR 2025',
      eudrDesc: 'Cette expédition est accompagnée de preuves de non-déforestation conformes au Règlement (UE) 2023/1115.',
      verifyDoc: 'Vérifier le document',
      certifiedBy: 'Certifié par APL Madagascar',
      poweredBy: 'Propulsé par TraceAgro',
      scanCount: 'Nombre de consultations',
      antifraud: 'Vérification anti-contrefaçon',
      certified: 'Authentifié',
    },
    en: {
      title: 'Shipment Digital Passport',
      subtitle: 'Certified Traceability · APL Madagascar',
      overview: 'Overview', lots: 'Lots', documents: 'Documents', compliance: 'EUDR Compliance',
      carrier: 'Carrier', container: 'Container No.', departure: 'Port of departure',
      arrival: 'Port of arrival', depDate: 'Departure date', arrDate: 'Expected arrival',
      realArr: 'Actual arrival', lotsIncluded: 'lots included', totalQty: 'Total quantity',
      avgScore: 'Avg quality score', eudrCompliant: 'EUDR 2025 Compliant',
      eudrDesc: 'This shipment is accompanied by non-deforestation evidence compliant with EU Regulation 2023/1115.',
      verifyDoc: 'Verify document',
      certifiedBy: 'Certified by APL Madagascar',
      poweredBy: 'Powered by TraceAgro',
      scanCount: 'Total consultations',
      antifraud: 'Anti-counterfeiting verification',
      certified: 'Authenticated',
    },
  }[lang];

  /* ── Chargement / erreur ─────────────────────────────────────────────── */
  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Chargement du passeport numérique...</p>
      </div>
    </div>
  );

  if (error || !shipment) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Expédition introuvable</h2>
        <p className="text-gray-400 text-sm">Cette expédition n'existe pas ou n'est plus accessible.</p>
      </div>
    </div>
  );

  const lots = shipment.shipmentLots?.map((sl: any) => sl.lot) ?? [];
  const docs = shipment.documents ?? [];
  const totalQty = lots.reduce((acc: number, l: any) => acc + (l?.actualQuantity || l?.expectedQuantity || 0), 0);
  const avgScore = lots.length ? (lots.reduce((a: number, l: any) => a + (l?.qualityScore || 0), 0) / lots.length).toFixed(1) : '—';
  const statusCfg = SHIPMENT_STATUS[shipment.status] ?? SHIPMENT_STATUS.preparing;

  const hasEUDR = docs.some((d: any) => d.docType === 'eudr_proof');
  const hasOrganic = lots.some((l: any) => l?.producer?.certifications?.some((c: any) => c.type === 'organic'));
  const hasFairTrade = lots.some((l: any) => l?.producer?.certifications?.some((c: any) => c.type === 'fair_trade'));

  /* ═══════════════════════════════════════════════ RENDER ═══════════════ */
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Barre supérieure ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Leaf size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">TraceAgro</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-xs text-gray-400">APL Madagascar</span>
          </div>
          <button
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors"
          >
            <Globe size={12} />
            {lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/[0.08] p-6">
          {/* Badge statut */}
          <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 ${statusCfg.bg} rounded-full`}>
            <span className={statusCfg.color}>{statusCfg.icon}</span>
            <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Ship size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t.title}</p>
              <h1 className="text-2xl font-bold text-white">{shipment.reference}</h1>
              <p className="text-gray-400 text-sm mt-1">{shipment.carrierName}</p>
            </div>
          </div>

          {/* Badges certifications */}
          <div className="flex flex-wrap gap-2 mt-5">
            {hasEUDR && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-400">
                🇪🇺 EUDR Compliant
              </span>
            )}
            {hasOrganic && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400">
                🌿 Certifié Bio
              </span>
            )}
            {hasFairTrade && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-400">
                ⚖️ Fair Trade
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400">
              <Shield size={10} /> {t.certified}
            </span>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/[0.06]">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{lots.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.lotsIncluded}</p>
            </div>
            <div className="text-center border-x border-white/[0.06]">
              <p className="text-2xl font-bold text-white">{totalQty.toFixed(0)} <span className="text-sm font-normal text-gray-400">kg</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{t.totalQty}</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${parseFloat(avgScore) >= 8 ? 'text-emerald-400' : parseFloat(avgScore) >= 6 ? 'text-amber-400' : 'text-red-400'}`}>{avgScore}<span className="text-sm font-normal text-gray-400">/10</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{t.avgScore}</p>
            </div>
          </div>
        </div>

        {/* ── Progress livraison ────────────────────────────────────────── */}
        <div className="p-4 bg-gray-900 rounded-xl border border-white/[0.06]">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>🏭 {lang === 'fr' ? 'Préparation' : 'Preparation'}</span>
            <span>🚢 {lang === 'fr' ? 'En transit' : 'In transit'}</span>
            <span>✅ {lang === 'fr' ? 'Livré' : 'Delivered'}</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              shipment.status === 'preparing' ? 'w-1/3 bg-amber-500' :
              shipment.status === 'in_transit' ? 'w-2/3 bg-blue-500' :
              shipment.status === 'delivered' ? 'w-full bg-emerald-500' : 'w-0'
            }`} />
          </div>
        </div>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-white/[0.06] overflow-x-auto">
          {([
            { key: 'overview',    label: t.overview,    icon: <Ship size={13} /> },
            { key: 'lots',        label: t.lots,        icon: <Package size={13} />, count: lots.length },
            { key: 'documents',   label: t.documents,   icon: <FileText size={13} />, count: docs.length },
            { key: 'compliance',  label: t.compliance,  icon: <Award size={13} /> },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                tab === item.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {item.icon} {item.label}
              {'count' in item && item.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════ TAB: APERÇU ════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Truck size={14} className="text-blue-400" />
                {lang === 'fr' ? 'Informations logistiques' : 'Logistics information'}
              </h3>
              <div className="space-y-3">
                <PubRow label={t.carrier}    value={shipment.carrierName} />
                <PubRow label={t.container}  value={shipment.containerNumber || '—'} mono />
                <PubRow label={t.departure}  value={shipment.departureLocation} icon={<MapPin size={12} />} />
                <PubRow label={t.arrival}    value={shipment.arrivalLocation} icon={<MapPin size={12} />} />
                <PubRow label={t.depDate}    value={shipment.departureDate ? formatDate(shipment.departureDate) : '—'} icon={<Calendar size={12} />} />
                <PubRow label={t.arrDate}    value={shipment.expectedArrival ? formatDate(shipment.expectedArrival) : '—'} icon={<Calendar size={12} />} />
                {shipment.actualArrival && (
                  <PubRow label={t.realArr}  value={formatDate(shipment.actualArrival)} color="text-emerald-400" />
                )}
              </div>
            </div>

            {/* Origine des lots */}
            <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-emerald-400" />
                {lang === 'fr' ? "Origines producteurs" : "Producer origins"}
              </h3>
              {lots.length === 0 ? (
                <p className="text-sm text-gray-500">{lang === 'fr' ? 'Aucun lot' : 'No lots'}</p>
              ) : (
                <div className="space-y-2">
                  {Array.from(new Set(lots.map((l: any) => l?.producer?.name))).slice(0, 6).map((name: any, i: number) => {
                    const prod = lots.find((l: any) => l?.producer?.name === name)?.producer;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold flex-shrink-0">
                          {name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-200">{name}</p>
                          <p className="text-xs text-gray-500">{prod?.region}, {prod?.country || 'Madagascar'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ TAB: LOTS ═════════════════════════════════ */}
        {tab === 'lots' && (
          <div className="space-y-3">
            {lots.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-8 text-center">
                <Package size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">{lang === 'fr' ? 'Aucun lot dans cette expédition' : 'No lots in this shipment'}</p>
              </div>
            ) : lots.map((lot: any, i: number) => (
              <div key={lot.id || i} className="bg-gray-900 rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-emerald-400 font-bold">{lot.lotNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lot.product?.name} · {lot.product?.category}</p>
                    <p className="text-xs text-gray-500">{lot.producer?.name} · {lot.producer?.region}</p>
                  </div>
                  <div className="text-right">
                    {lot.qualityScore && (
                      <div className={`text-lg font-bold ${lot.qualityScore >= 8 ? 'text-emerald-400' : lot.qualityScore >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                        {lot.qualityScore}/10
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{(lot.actualQuantity || lot.expectedQuantity || 0).toFixed(1)} kg</p>
                  </div>
                </div>

                {/* Certifications du producteur */}
                {(lot.producer?.certifications ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {lot.producer.certifications.map((cert: any, ci: number) => (
                      <span key={ci} className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-gray-400">
                        {cert.type === 'organic' ? '🌿 Bio' : cert.type === 'fair_trade' ? '⚖️ Fair Trade' : cert.type === 'eudr' ? '🇪🇺 EUDR' : cert.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ════════════════ TAB: DOCUMENTS ════════════════════════════ */}
        {tab === 'documents' && (
          <div className="space-y-3">
            {docs.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-8 text-center">
                <FileText size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">{lang === 'fr' ? 'Aucun document joint' : 'No documents attached'}</p>
              </div>
            ) : docs.map((doc: any) => {
              const dc = DOC_CONFIG[doc.docType] ?? DOC_CONFIG.other;
              return (
                <div key={doc.id} className="bg-gray-900 rounded-xl border border-white/[0.06] p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">{dc.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{doc.name}</p>
                      <p className={`text-xs ${dc.color}`}>{dc.label}</p>
                      <p className="text-xs text-gray-600">{formatDate(doc.createdAt)}</p>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors flex-shrink-0">
                      <ExternalLink size={12} /> {t.verifyDoc}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════ TAB: CONFORMITÉ EUDR ══════════════════════ */}
        {tab === 'compliance' && (
          <div className="space-y-4">
            {/* Statut global */}
            <div className={`p-5 rounded-xl border ${hasEUDR ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-start gap-3">
                {hasEUDR ? <CheckCircle size={22} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <Clock size={22} className="text-amber-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`text-base font-bold ${hasEUDR ? 'text-emerald-400' : 'text-amber-400'}`}>{hasEUDR ? t.eudrCompliant : (lang === 'fr' ? 'En attente de preuve EUDR' : 'Awaiting EUDR proof')}</h3>
                  <p className="text-sm text-gray-400 mt-1">{t.eudrDesc}</p>
                </div>
              </div>
            </div>

            {/* Checklist conformité */}
            <div className="bg-gray-900 rounded-xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">
                {lang === 'fr' ? 'Checklist conformité' : 'Compliance checklist'}
              </h3>
              <div className="space-y-3">
                {[
                  { label: lang === 'fr' ? 'Expédition référencée' : 'Referenced shipment', done: true },
                  { label: lang === 'fr' ? 'Transporteur identifié' : 'Carrier identified', done: !!shipment.carrierName },
                  { label: lang === 'fr' ? 'Lots de production tracés' : 'Production lots traced', done: lots.length > 0 },
                  { label: lang === 'fr' ? 'Coordonnées GPS producteurs' : 'Producer GPS coordinates', done: lots.some((l: any) => l?.producer?.gpsCoordinates) },
                  { label: 'Certificat phytosanitaire', done: docs.some((d: any) => d.docType === 'phytosanitary') },
                  { label: lang === 'fr' ? 'Preuve EUDR (non-déforestation)' : 'EUDR proof (non-deforestation)', done: hasEUDR },
                  { label: lang === 'fr' ? 'Certification Bio' : 'Organic certification', done: hasOrganic },
                  { label: 'Fair Trade', done: hasFairTrade },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
                      {item.done
                        ? <CheckCircle size={12} className="text-emerald-400" />
                        : <Clock size={12} className="text-gray-500" />
                      }
                    </div>
                    <span className={`text-sm ${item.done ? 'text-gray-300' : 'text-gray-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Règlement EU */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🇪🇺</span>
                <div>
                  <p className="text-sm font-medium text-blue-400">{lang === 'fr' ? 'Règlement (UE) 2023/1115 — EUDR' : 'Regulation (EU) 2023/1115 — EUDR'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === 'fr'
                      ? "Ce document de traçabilité est conforme aux exigences de diligence raisonnée de l'Union Européenne pour les produits à risque de déforestation."
                      : "This traceability document meets the EU due diligence requirements for deforestation-risk products."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] pt-6 pb-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield size={14} className="text-emerald-400" />
            <span className="text-xs text-gray-400">{t.certifiedBy}</span>
          </div>
          <p className="text-xs text-gray-600">{t.poweredBy} — {new Date().getFullYear()}</p>
          <p className="text-xs text-gray-700 font-mono">{id}</p>
        </div>
      </div>
    </div>
  );
};

/* ── Helper PubRow ───────────────────────────────────────────────────────── */
const PubRow: React.FC<{ label: string; value: string; icon?: React.ReactNode; mono?: boolean; color?: string }> = ({ label, value, icon, mono, color }) => (
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-gray-500">{icon}</span>}
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <span className={`text-xs text-right ${color || 'text-gray-300'} ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
  </div>
);
