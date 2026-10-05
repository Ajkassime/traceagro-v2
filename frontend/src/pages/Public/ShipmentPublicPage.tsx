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
import { StatusBadge } from '../../components/ui/Badge';

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
    <div className="min-h-screen bg-[#F5F0E7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#352638] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#70656B] text-sm font-medium">Chargement du passeport numérique d'expédition...</p>
      </div>
    </div>
  );

  if (error || !shipment) return (
    <div className="min-h-screen bg-[#F5F0E7] flex items-center justify-center p-4">
      <div className="text-center max-w-sm p-6 bg-[#FFFCF6] border border-[#D8CEC4] rounded-[8px]">
        <AlertCircle size={44} className="mx-auto text-[#963C47] mb-3" />
        <h2 className="text-xl font-serif font-medium text-[#352638] mb-2">Expédition introuvable</h2>
        <p className="text-[#70656B] text-sm">Cette expédition n'existe pas ou n'est plus accessible dans le registre.</p>
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
    <div className="min-h-screen bg-[#F5F0E7] text-[#352638] font-sans">

      {/* ── Barre supérieure ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#FFFCF6] border-b border-[#D8CEC4] shadow-xs">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#352638] flex items-center justify-center text-[#FFFCF6] font-serif font-bold text-sm">
              TA
            </div>
            <div>
              <span className="text-sm font-serif font-medium text-[#352638]">TraceAgro</span>
              <span className="text-[#D8CEC4] mx-2">·</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#AD5138]">APL Madagascar</span>
            </div>
          </div>
          <button
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFCF6] border border-[#D8CEC4] rounded-[6px] text-xs font-semibold text-[#352638] hover:bg-[#EAE2EB] transition-colors"
          >
            <Globe size={13} className="text-[#AD5138]" />
            {lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Carte principale ────────────────────────────────────────── */}
        <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-6 shadow-xs relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[6px] bg-[#EAE2EB] border border-[#D8CEC4] flex items-center justify-center flex-shrink-0 text-[#352638]">
                <Ship size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#70656B] mb-1">{t.title}</p>
                <h1 className="text-2xl font-mono font-bold text-[#352638]">{shipment.reference}</h1>
                <p className="text-xs font-medium text-[#70656B] mt-0.5">{shipment.carrierName}</p>
              </div>
            </div>
            <StatusBadge config={statusCfg} />
          </div>

          {/* Badges certifications */}
          <div className="flex flex-wrap gap-2 mt-5">
            {hasEUDR && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#EAE2EB] border border-[#352638]/20 rounded-full text-xs font-semibold text-[#352638]">
                🇪🇺 EUDR Compliant
              </span>
            )}
            {hasOrganic && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#E5ECD9] border border-[#435432]/30 rounded-full text-xs font-semibold text-[#435432]">
                🌿 Certifié Bio
              </span>
            )}
            {hasFairTrade && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F5E8CC] border border-[#795015]/30 rounded-full text-xs font-semibold text-[#795015]">
                ⚖️ Fair Trade
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#E5ECD9] border border-[#435432]/30 rounded-full text-xs font-semibold text-[#435432]">
              <Shield size={11} /> {t.certified}
            </span>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#D8CEC4]">
            <div className="text-center">
              <p className="text-2xl font-serif font-medium text-[#352638]">{lots.length}</p>
              <p className="text-xs text-[#70656B] mt-0.5">{t.lotsIncluded}</p>
            </div>
            <div className="text-center border-x border-[#D8CEC4]">
              <p className="text-2xl font-serif font-medium text-[#352638]">{totalQty.toFixed(0)} <span className="text-sm font-sans font-normal text-[#70656B]">kg</span></p>
              <p className="text-xs text-[#70656B] mt-0.5">{t.totalQty}</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-serif font-medium ${parseFloat(avgScore) >= 8 ? 'text-[#435432]' : parseFloat(avgScore) >= 6 ? 'text-[#795015]' : 'text-[#963C47]'}`}>{avgScore}<span className="text-sm font-sans font-normal text-[#70656B]">/10</span></p>
              <p className="text-xs text-[#70656B] mt-0.5">{t.avgScore}</p>
            </div>
          </div>
        </div>

        {/* ── Progress livraison ────────────────────────────────────────── */}
        <div className="p-4 bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4]">
          <div className="flex justify-between text-xs font-semibold text-[#70656B] mb-2">
            <span>🏭 {lang === 'fr' ? 'Préparation' : 'Preparation'}</span>
            <span>🚢 {lang === 'fr' ? 'En transit' : 'In transit'}</span>
            <span>✅ {lang === 'fr' ? 'Livré' : 'Delivered'}</span>
          </div>
          <div className="h-2.5 bg-[#EAE2EB] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              shipment.status === 'preparing' ? 'w-1/3 bg-[#795015]' :
              shipment.status === 'in_transit' ? 'w-2/3 bg-[#352638]' :
              shipment.status === 'delivered' ? 'w-full bg-[#435432]' : 'w-0'
            }`} />
          </div>
        </div>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <div className="flex gap-1.5 p-1.5 bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] overflow-x-auto">
          {([
            { key: 'overview',    label: t.overview,    icon: <Ship size={14} /> },
            { key: 'lots',        label: t.lots,        icon: <Package size={14} />, count: lots.length },
            { key: 'documents',   label: t.documents,   icon: <FileText size={14} />, count: docs.length },
            { key: 'compliance',  label: t.compliance,  icon: <Award size={14} /> },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[6px] transition-all whitespace-nowrap ${
                tab === item.key ? 'bg-[#352638] text-[#FFFCF6]' : 'text-[#70656B] hover:text-[#352638]'
              }`}
            >
              {item.icon} {item.label}
              {'count' in item && item.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#EAE2EB] text-[#352638] text-[10px]">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════ TAB: APERÇU ════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-[#352638] mb-4 flex items-center gap-2">
                <Truck size={14} className="text-[#352638]" />
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
                  <PubRow label={t.realArr}  value={formatDate(shipment.actualArrival)} color="text-[#435432]" />
                )}
              </div>
            </div>

            {/* Origine des lots */}
            <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-[#352638] mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-[#AD5138]" />
                {lang === 'fr' ? "Origines producteurs" : "Producer origins"}
              </h3>
              {lots.length === 0 ? (
                <p className="text-sm text-[#70656B]">{lang === 'fr' ? 'Aucun lot' : 'No lots'}</p>
              ) : (
                <div className="space-y-2">
                  {Array.from(new Set(lots.map((l: any) => l?.producer?.name))).slice(0, 6).map((name: any, i: number) => {
                    const prod = lots.find((l: any) => l?.producer?.name === name)?.producer;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-[#F5F0E7] rounded-[6px] border border-[#D8CEC4]">
                        <div className="w-7 h-7 rounded-full bg-[#EAE2EB] flex items-center justify-center text-xs text-[#352638] font-bold flex-shrink-0">
                          {name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#352638]">{name}</p>
                          <p className="text-xs text-[#70656B]">{prod?.region}, {prod?.country || 'Madagascar'}</p>
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
              <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-8 text-center shadow-xs">
                <Package size={32} className="mx-auto text-[#70656B] mb-3" />
                <p className="text-[#70656B]">{lang === 'fr' ? 'Aucun lot dans cette expédition' : 'No lots in this shipment'}</p>
              </div>
            ) : lots.map((lot: any, i: number) => (
              <div key={lot.id || i} className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-[#AD5138] font-bold">{lot.lotNumber}</p>
                    <p className="text-xs text-[#70656B] mt-0.5">{lot.product?.name} · {lot.product?.category}</p>
                    <p className="text-xs text-[#70656B]">{lot.producer?.name} · {lot.producer?.region}</p>
                  </div>
                  <div className="text-right">
                    {lot.qualityScore && (
                      <div className={`text-lg font-bold ${lot.qualityScore >= 8 ? 'text-[#435432]' : lot.qualityScore >= 6 ? 'text-[#795015]' : 'text-[#963C47]'}`}>
                        {lot.qualityScore}/10
                      </div>
                    )}
                    <p className="text-xs text-[#70656B] font-medium tabular-nums">{(lot.actualQuantity || lot.expectedQuantity || 0).toFixed(1)} kg</p>
                  </div>
                </div>

                {/* Certifications du producteur */}
                {(lot.producer?.certifications ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {lot.producer.certifications.map((cert: any, ci: number) => (
                      <span key={ci} className="px-2 py-0.5 text-xs rounded-full bg-[#EAE2EB] text-[#352638] font-medium">
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
              <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-8 text-center shadow-xs">
                <FileText size={32} className="mx-auto text-[#70656B] mb-3" />
                <p className="text-[#70656B]">{lang === 'fr' ? 'Aucun document joint' : 'No documents attached'}</p>
              </div>
            ) : docs.map((doc: any) => {
              const dc = DOC_CONFIG[doc.docType] ?? DOC_CONFIG.other;
              return (
                <div key={doc.id} className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-4 hover:border-[#AD5138] transition-colors shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[6px] bg-[#EAE2EB] flex items-center justify-center text-xl flex-shrink-0">{dc.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#352638] truncate">{doc.name}</p>
                      <p className={`text-xs ${dc.color}`}>{dc.label}</p>
                      <p className="text-xs text-[#70656B]">{formatDate(doc.createdAt)}</p>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F0E7] rounded-[6px] text-xs font-semibold text-[#352638] hover:bg-[#EAE2EB] transition-colors flex-shrink-0">
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
            <div className={`p-5 rounded-[8px] border ${hasEUDR ? 'bg-[#E5ECD9] border-[#435432]/30' : 'bg-[#F5E8CC] border-[#795015]/30'}`}>
              <div className="flex items-start gap-3">
                {hasEUDR ? <CheckCircle size={22} className="text-[#435432] flex-shrink-0 mt-0.5" /> : <Clock size={22} className="text-[#795015] flex-shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`text-base font-bold ${hasEUDR ? 'text-[#435432]' : 'text-[#795015]'}`}>{hasEUDR ? t.eudrCompliant : (lang === 'fr' ? 'En attente de preuve EUDR' : 'Awaiting EUDR proof')}</h3>
                  <p className="text-sm text-[#70656B] mt-1">{t.eudrDesc}</p>
                </div>
              </div>
            </div>

            {/* Checklist conformité */}
            <div className="bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-[#352638] mb-4">
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
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-[#E5ECD9]' : 'bg-[#EAE2EB]'}`}>
                      {item.done
                        ? <CheckCircle size={12} className="text-[#435432]" />
                        : <Clock size={12} className="text-[#70656B]" />
                      }
                    </div>
                    <span className={`text-sm ${item.done ? 'text-[#352638] font-medium' : 'text-[#70656B]'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Règlement EU */}
            <div className="bg-[#FFFCF6] border border-[#D8CEC4] rounded-[8px] p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="text-xl">🇪🇺</span>
                <div>
                  <p className="text-sm font-semibold text-[#352638]">{lang === 'fr' ? 'Règlement (UE) 2023/1115 — EUDR' : 'Regulation (EU) 2023/1115 — EUDR'}</p>
                  <p className="text-xs text-[#70656B] mt-1">
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
        <div className="border-t border-[#D8CEC4] pt-6 pb-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield size={14} className="text-[#435432]" />
            <span className="text-xs text-[#70656B] font-medium">{t.certifiedBy}</span>
          </div>
          <p className="text-xs text-[#70656B]">{t.poweredBy} — {new Date().getFullYear()}</p>
          <p className="text-xs text-[#70656B] font-mono">{id}</p>
        </div>
      </div>
    </div>
  );
};

/* ── Helper PubRow ───────────────────────────────────────────────────────── */
const PubRow: React.FC<{ label: string; value: string; icon?: React.ReactNode; mono?: boolean; color?: string }> = ({ label, value, icon, mono, color }) => (
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[#70656B]">{icon}</span>}
      <span className="text-xs text-[#70656B]">{label}</span>
    </div>
    <span className={`text-xs text-right ${color || 'text-[#352638]'} ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
  </div>
);
