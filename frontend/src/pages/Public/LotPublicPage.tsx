import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Leaf, MapPin, Calendar, Scale, CheckCircle, Package, Award,
  Globe, Phone, Mail, Star, Clock, AlertTriangle, Layers,
  ChevronRight, QrCode, Download, Eye, Users, Thermometer,
  Droplets, ArrowRight, Shield, FileCheck, ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Configs ──────────────────────────────────────────────────────────────────
const CERT_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; desc: string }> = {
  organic:    { label: 'Bio / Organique',    emoji: '🌿', color: '#22c55e', bg: '#22c55e18', desc: 'Production sans pesticides ni OGM' },
  fair_trade: { label: 'Commerce Équitable', emoji: '⚖️', color: '#f59e0b', bg: '#f59e0b18', desc: 'Rémunération juste des producteurs' },
  eudr:       { label: 'Conforme EUDR',      emoji: '🇪🇺', color: '#3b82f6', bg: '#3b82f618', desc: 'EU Deforestation Regulation 2024' },
  rainforest: { label: 'Rainforest Alliance',emoji: '🌧️', color: '#10b981', bg: '#10b98118', desc: 'Protection biodiversité certifiée' },
  other:      { label: 'Certification',      emoji: '📋', color: '#8b5cf6', bg: '#8b5cf618', desc: 'Certification professionnelle' },
};

const LOT_STATUS: Record<string, { label: string; color: string; step: number }> = {
  harvest:    { label: 'Récolté',       color: '#d4a853', step: 1 },
  processing: { label: 'Transformation',color: '#3b82f6', step: 2 },
  processed:  { label: 'Transformé',    color: '#8b5cf6', step: 3 },
  transit:    { label: 'En transit',    color: '#f59e0b', step: 4 },
  exported:   { label: 'Exporté',       color: '#22c55e', step: 5 },
  rejected:   { label: 'Rejeté',        color: '#ef4444', step: 0 },
};

const TABS_FR = ['Aperçu', 'Producteur', 'Transformation', 'Certifications', 'Expédition'];
const TABS_EN = ['Overview', 'Producer', 'Processing', 'Certifications', 'Shipment'];

function formatDate(d: string | null | undefined, lang = 'fr') {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function certExpiryDays(expiresAt: string) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export const LotPublicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [tab, setTab]   = useState(0);
  const [scanSent, setScanSent] = useState(false);

  const T = (fr: string, en: string) => lang === 'fr' ? fr : en;
  const TABS = lang === 'fr' ? TABS_FR : TABS_EN;

  // Fetch lot public
  const { data: lot, isLoading, error } = useQuery({
    queryKey: ['lot-public', id],
    queryFn: () => api.get(`/lots/public/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  // Enregistrer le scan au chargement
  useEffect(() => {
    if (id && lot && !scanSent) {
      setScanSent(true);
      api.post(`/lots/public/${id}/scan`, {}).catch(() => {});
    }
  }, [id, lot, scanSent]);

  // ── Loading ──
  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0a0f0d' }}>
      <div className="w-12 h-12 rounded-2xl bg-[#1b4332] flex items-center justify-center animate-pulse">
        <Leaf size={24} className="text-[#22c55e]" />
      </div>
      <p className="text-[#8b949e] text-sm">{T('Chargement du passeport numérique...', 'Loading digital passport...')}</p>
    </div>
  );

  // ── Not found ──
  if (error || !lot) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#0a0f0d' }}>
      <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-500/20 flex items-center justify-center">
        <Package size={32} className="text-red-400" />
      </div>
      <p className="text-white font-bold text-xl">{T('Lot introuvable', 'Lot not found')}</p>
      <p className="text-[#8b949e] text-sm">{T('Ce QR code ne correspond à aucun lot enregistré.', 'This QR code does not match any registered lot.')}</p>
    </div>
  );

  const statusCfg = LOT_STATUS[lot.status] ?? LOT_STATUS.harvest;
  const scanCount = lot._count?.scanLogs ?? 0;
  const hasGPS    = !!(lot.harvestLatitude && lot.harvestLongitude);
  const shipment  = lot.shipmentLots?.[0]?.shipment;

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0f0d', fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <header style={{ background: 'linear-gradient(135deg, #0d1117 0%, #111816 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1b4332, #2d6a4f)' }}>
              <Leaf size={20} className="text-[#52b788]" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">TraceAgro APL</p>
              <p className="text-xs" style={{ color: '#6e7681' }}>
                {T('Traçabilité certifiée · Madagascar', 'Certified Traceability · Madagascar')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge Vérifié */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#22c55e18', border: '1px solid #22c55e40' }}>
              <CheckCircle size={13} className="text-[#22c55e]" />
              <span className="text-xs font-semibold text-[#22c55e]">{T('Vérifié', 'Verified')}</span>
            </div>
            {/* Toggle langue */}
            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', color: '#8b949e' }}
            >
              <Globe size={12} />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO — Identité du lot                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-5 pt-6 pb-2">
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #111816 0%, #161b22 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Fond décoratif */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${statusCfg.color} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

          <div className="relative">
            {/* Numéro + produit */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: '#6e7681' }}>{T('PASSEPORT NUMÉRIQUE', 'DIGITAL PASSPORT')}</p>
                <p className="font-mono text-2xl font-bold" style={{ color: '#d4a853' }}>{lot.lotNumber}</p>
                <p className="text-lg font-semibold text-white mt-0.5">{lot.product?.name}</p>
                <p className="text-sm mt-0.5" style={{ color: '#8b949e' }}>{lot.product?.category}</p>
              </div>
              {/* Score qualité */}
              {lot.qualityScore && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
                    style={{ background: lot.qualityScore >= 8 ? '#22c55e18' : lot.qualityScore >= 6 ? '#f59e0b18' : '#ef444418',
                             border: `2px solid ${lot.qualityScore >= 8 ? '#22c55e' : lot.qualityScore >= 6 ? '#f59e0b' : '#ef4444'}` }}>
                    <span className="text-xl font-bold" style={{ color: lot.qualityScore >= 8 ? '#22c55e' : lot.qualityScore >= 6 ? '#f59e0b' : '#ef4444' }}>
                      {lot.qualityScore.toFixed(1)}
                    </span>
                    <span className="text-[10px]" style={{ color: '#6e7681' }}>/10</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: '#6e7681' }}>{T('Qualité', 'Quality')}</p>
                </div>
              )}
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={<Scale size={14} />} label={T('Quantité', 'Quantity')} value={`${lot.quantityKg} kg`} />
              <MiniStat icon={<Calendar size={14} />} label={T('Récolte', 'Harvest')} value={formatDate(lot.harvestDate, lang)} small />
              <div className="rounded-xl p-3 text-center" style={{ background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}30` }}>
                <div className="w-5 h-5 rounded-full mx-auto mb-1" style={{ background: statusCfg.color }} />
                <p className="text-xs font-semibold" style={{ color: statusCfg.color }}>{statusCfg.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#6e7681' }}>Status</p>
              </div>
            </div>

            {/* Badge Anti-Contrefaçon & compteur de scans */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Badge Authentifié */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                style={{ background: 'rgba(82,183,136,0.1)', border: '1px solid rgba(82,183,136,0.25)', color: '#52b788' }}>
                <Shield size={11} />
                <span>{T('Authentifié TraceAgro', 'TraceAgro Authenticated')}</span>
              </div>

              {/* Compteur scans avec couleur contextuelle */}
              {scanCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background: scanCount > 500 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${scanCount > 500 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    color: scanCount > 500 ? '#f87171' : '#6e7681'
                  }}>
                  <Eye size={11} />
                  <span>{scanCount} {T('consultation(s)', 'consultation(s)')}</span>
                  {scanCount > 500 && <span>⚠️</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression du lot */}
        <LotProgressBar status={lot.status} lang={lang} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* NAVIGATION TABS                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-5 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={tab === i
                ? { background: '#1b4332', color: '#52b788', border: '1px solid #2d6a4f' }
                : { background: '#161b22', color: '#6e7681', border: '1px solid rgba(255,255,255,0.05)' }
              }>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENU TABS                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-5 py-4 space-y-4 pb-10">

        {/* ── TAB 0 : APERÇU ── */}
        {tab === 0 && (
          <>
            {/* Carte GPS */}
            {hasGPS ? (
              <Section title={T('📍 Localisation de la parcelle', '📍 Plot Location')}>
                <div className="rounded-xl overflow-hidden" style={{ height: 220 }}>
                  <MapContainer center={[lot.harvestLatitude!, lot.harvestLongitude!]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    <Marker position={[lot.harvestLatitude!, lot.harvestLongitude!]}>
                      <Popup><strong>{lot.producer?.name}</strong><br />{lot.producer?.region}, Madagascar</Popup>
                    </Marker>
                    <Circle center={[lot.harvestLatitude!, lot.harvestLongitude!]} radius={500}
                      pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.1, weight: 2 }} />
                  </MapContainer>
                </div>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <MapPin size={13} className="text-[#52b788]" />
                  <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
                    {lot.harvestLatitude?.toFixed(5)}, {lot.harvestLongitude?.toFixed(5)}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: '#22c55e18', color: '#22c55e' }}>
                    {T('Zone vérifiée EUDR', 'EUDR verified zone')}
                  </span>
                </div>
              </Section>
            ) : (
              <Section title={T('📍 Localisation', '📍 Location')}>
                <div className="text-center py-6" style={{ color: '#6e7681' }}>
                  <MapPin size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{lot.producer?.region}, {lot.producer?.country}</p>
                  <p className="text-xs mt-1 opacity-60">{T('Coordonnées GPS non renseignées', 'GPS coordinates not provided')}</p>
                </div>
              </Section>
            )}

            {/* Galerie photos */}
            {(lot.photos ?? []).length > 0 && (
              <Section title={T('📸 Galerie', '📸 Gallery')}>
                <div className="grid grid-cols-3 gap-2">
                  {lot.photos.map((p: any) => (
                    <div key={p.id} className="rounded-xl overflow-hidden aspect-square" style={{ background: '#161b22' }}>
                      <img src={p.url} alt={p.caption || 'Photo'} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Données agronomiques si disponibles */}
            {lot.processingSteps?.some((s: any) => s.temperature || s.humidity) && (
              <Section title={T('🌡️ Données agronomiques', '🌡️ Agronomic Data')}>
                <div className="space-y-2">
                  {lot.processingSteps.filter((s: any) => s.temperature || s.humidity).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm" style={{ color: '#c9d1d9' }}>{s.stepName}</span>
                      <div className="flex gap-4">
                        {s.temperature && <span className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}><Thermometer size={12} />{s.temperature}°C</span>}
                        {s.humidity    && <span className="flex items-center gap-1 text-xs" style={{ color: '#3b82f6' }}><Droplets size={12} />{s.humidity}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Certifications résumé */}
            {(lot.producer?.certifications ?? []).length > 0 && (
              <Section title={T('🏅 Certifications actives', '🏅 Active Certifications')}>
                <div className="flex flex-wrap gap-2">
                  {lot.producer.certifications.map((c: any) => {
                    const cfg = CERT_CONFIG[c.type] ?? CERT_CONFIG.other;
                    const days = certExpiryDays(c.expiresAt);
                    return (
                      <div key={c.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                        <span className="text-base">{cfg.emoji}</span>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                          <p className="text-[10px]" style={{ color: '#6e7681' }}>
                            {days > 0 ? T(`Valide ${days}j`, `Valid ${days}d`) : T('Expirée', 'Expired')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── TAB 1 : PRODUCTEUR ── */}
        {tab === 1 && (
          <>
            {/* Photo + info principale */}
            <Section title={T('👤 Portrait du producteur', '👤 Producer Portrait')}>
              <div className="flex items-center gap-4 mb-4">
                {lot.producer?.photos?.[0] ? (
                  <img src={lot.producer.photos[0].url} alt={lot.producer.name}
                    className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#1b433218', border: '1px solid #2d6a4f40' }}>
                    <Users size={32} className="text-[#52b788] opacity-60" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-white">{lot.producer?.name}</p>
                  <div className="flex items-center gap-1 mt-1" style={{ color: '#8b949e' }}>
                    <MapPin size={13} />
                    <span className="text-sm">{lot.producer?.region}, {lot.producer?.country}</span>
                  </div>
                  {lot.producer?.village && (
                    <p className="text-sm mt-0.5" style={{ color: '#6e7681' }}>{T('Village :', 'Village:')} {lot.producer.village}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {lot.producer?.areaHectares && (
                  <InfoCard icon="🌱" label={T('Surface cultivée', 'Farmed Area')} value={`${lot.producer.areaHectares} ha`} />
                )}
                <InfoCard icon="📦" label={T('Lots produits', 'Produced Lots')} value={`${lot.producer?._count?.lots ?? '—'}`} />
                {lot.producer?.telephone && (
                  <InfoCard icon="📞" label={T('Contact', 'Contact')} value={lot.producer.telephone} />
                )}
                {lot.producer?.email && (
                  <InfoCard icon="✉️" label="Email" value={lot.producer.email} small />
                )}
              </div>
            </Section>

            {/* Certifications détail */}
            <Section title={T('🏅 Certifications du producteur', '🏅 Producer Certifications')}>
              {(lot.producer?.certifications ?? []).length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#6e7681' }}>{T('Aucune certification', 'No certifications')}</p>
              ) : (
                <div className="space-y-3">
                  {lot.producer.certifications.map((c: any) => {
                    const cfg  = CERT_CONFIG[c.type] ?? CERT_CONFIG.other;
                    const days = certExpiryDays(c.expiresAt);
                    return (
                      <div key={c.id} className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{cfg.emoji}</span>
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{cfg.desc}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: '#6e7681' }}>
                              <span>🏢 {c.issuer}</span>
                              <span>📅 {T('Émise :', 'Issued:')} {formatDate(c.issuedAt, lang)}</span>
                              <span className={days < 30 ? 'text-orange-400' : days < 0 ? 'text-red-400' : ''}>
                                ⏳ {days > 0 ? T(`Expire dans ${days}j`, `Expires in ${days}d`) : T('Expirée', 'Expired')}
                              </span>
                            </div>
                          </div>
                          {days > 0 && <CheckCircle size={16} style={{ color: cfg.color }} className="flex-shrink-0 mt-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── TAB 2 : TRANSFORMATION ── */}
        {tab === 2 && (
          <Section title={T('⚙️ Étapes de transformation', '⚙️ Processing Steps')}>
            {(lot.processingSteps ?? []).length === 0 ? (
              <div className="text-center py-8" style={{ color: '#6e7681' }}>
                <Layers size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">{T('Aucune étape enregistrée', 'No processing steps recorded')}</p>
              </div>
            ) : (
              <div className="relative">
                {/* Ligne verticale timeline */}
                <div className="absolute left-5 top-6 bottom-6 w-0.5" style={{ background: 'linear-gradient(to bottom, #1b4332, #2d6a4f40)' }} />

                <div className="space-y-4">
                  {lot.processingSteps.map((step: any, i: number) => (
                    <div key={step.id} className="flex gap-4">
                      {/* Bullet */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 relative"
                        style={{ background: '#1b4332', border: '2px solid #2d6a4f' }}>
                        <span className="text-sm font-bold text-[#52b788]">{i + 1}</span>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 rounded-xl p-4 mb-1" style={{ background: '#111816', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="font-semibold text-white">{step.stepName}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: '#8b949e' }}>
                          <span>📅 {formatDate(step.startedAt, lang)}</span>
                          {step.operatorName && <span>👤 {step.operatorName}</span>}
                          {step.location    && <span>📍 {step.location}</span>}
                          {step.inputQuantity  && <span>⬇️ {step.inputQuantity} kg {T('entrée', 'input')}</span>}
                          {step.outputQuantity && <span>⬆️ {step.outputQuantity} kg {T('sortie', 'output')}</span>}
                          {step.temperature && <span>🌡️ {step.temperature}°C</span>}
                          {step.humidity    && <span>💧 {step.humidity}%</span>}
                        </div>
                        {step.qualityScore && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <div key={n} className="w-3 h-1.5 rounded-full" style={{ background: n <= step.qualityScore ? '#22c55e' : '#1e2a22' }} />
                              ))}
                            </div>
                            <span className="text-xs font-mono" style={{ color: '#22c55e' }}>{step.qualityScore}/10</span>
                          </div>
                        )}
                        {/* Photos de l'étape */}
                        {step.photos?.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto">
                            {step.photos.map((ph: any) => (
                              <img key={ph.id} src={ph.url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Fin de timeline */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 relative"
                      style={{ background: '#22c55e18', border: '2px solid #22c55e' }}>
                      <CheckCircle size={18} className="text-[#22c55e]" />
                    </div>
                    <div className="flex-1 rounded-xl p-4" style={{ background: '#22c55e08', border: '1px solid #22c55e20' }}>
                      <p className="font-semibold text-[#22c55e]">{T('Transformation terminée', 'Processing Complete')}</p>
                      <p className="text-xs mt-1" style={{ color: '#6e7681' }}>{T('Lot prêt pour expédition', 'Lot ready for shipment')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── TAB 3 : CERTIFICATIONS ── */}
        {tab === 3 && (
          <>
            <Section title={T('🛡️ Conformité réglementaire', '🛡️ Regulatory Compliance')}>
              <div className="space-y-3">
                <ComplianceBadge
                  icon="🇪🇺" title="EUDR — EU Deforestation Regulation"
                  desc={T('Ce lot est conforme au règlement UE sur la déforestation (2024). Les coordonnées GPS de la parcelle de récolte ont été vérifiées.', 'This lot complies with the EU Deforestation Regulation (2024). GPS coordinates of the harvest plot have been verified.')}
                  ok={hasGPS}
                  color="#3b82f6"
                />
                <ComplianceBadge
                  icon="🌿" title={T('Agriculture biologique', 'Organic Farming')}
                  desc={T('Production sans pesticides de synthèse, OGM ni engrais chimiques.', 'Production without synthetic pesticides, GMOs, or chemical fertilizers.')}
                  ok={lot.producer?.certifications?.some((c: any) => c.type === 'organic')}
                  color="#22c55e"
                />
                <ComplianceBadge
                  icon="⚖️" title={T('Commerce équitable', 'Fair Trade')}
                  desc={T('Rémunération juste et traçable des producteurs malgaches.', 'Fair and traceable remuneration of Malagasy producers.')}
                  ok={lot.producer?.certifications?.some((c: any) => c.type === 'fair_trade')}
                  color="#f59e0b"
                />
              </div>
            </Section>

            {/* Documents officiels */}
            {(lot.documents ?? []).length > 0 && (
              <Section title={T('📄 Documents officiels', '📄 Official Documents')}>
                <div className="space-y-2">
                  {lot.documents.map((doc: any) => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors"
                      style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#3b82f618', border: '1px solid #3b82f630' }}>
                        <FileCheck size={16} className="text-[#3b82f6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        <p className="text-xs" style={{ color: '#6e7681' }}>{doc.docType}</p>
                      </div>
                      <ExternalLink size={14} style={{ color: '#6e7681' }} />
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── TAB 4 : EXPÉDITION ── */}
        {tab === 4 && (
          <Section title={T('🚢 Expédition', '🚢 Shipment')}>
            {!shipment ? (
              <div className="text-center py-8" style={{ color: '#6e7681' }}>
                <Package size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">{T('Aucune expédition associée à ce lot', 'No shipment associated with this lot')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono font-bold text-[#d4a853]">{shipment.reference}</p>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: '#3b82f618', color: '#3b82f6', border: '1px solid #3b82f630' }}>
                      {shipment.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 rounded-lg p-2.5 text-center" style={{ background: '#0d1117' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#6e7681' }}>{T('Départ', 'Departure')}</p>
                      <p className="font-medium text-white text-xs">{shipment.departureLocation || '—'}</p>
                      {shipment.departureDate && <p className="text-[10px] mt-0.5" style={{ color: '#8b949e' }}>{formatDate(shipment.departureDate, lang)}</p>}
                    </div>
                    <ArrowRight size={16} className="flex-shrink-0 text-[#52b788]" />
                    <div className="flex-1 rounded-lg p-2.5 text-center" style={{ background: '#0d1117' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#6e7681' }}>{T('Arrivée', 'Arrival')}</p>
                      <p className="font-medium text-white text-xs">{shipment.arrivalLocation || '—'}</p>
                      {shipment.actualArrival && <p className="text-[10px] mt-0.5" style={{ color: '#8b949e' }}>{formatDate(shipment.actualArrival, lang)}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* FOOTER COMMUN                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-4 text-center" style={{ background: '#111816', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={14} className="text-[#52b788]" />
            <p className="text-xs font-semibold text-[#52b788]">
              {T('Données certifiées par TraceAgro APL Madagascar', 'Data certified by TraceAgro APL Madagascar')}
            </p>
          </div>
          <p className="text-xs" style={{ color: '#6e7681' }}>
            {T('Conforme EUDR · Règlement UE 2023/1115', 'EUDR Compliant · EU Regulation 2023/1115')} · {new Date().getFullYear()}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs" style={{ color: '#6e7681' }}>
            <span>🌐 traceagro.mg</span>
            <span>·</span>
            <span>📧 apl@traceagro.mg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Composants internes ──────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#111816' }}>
      <p className="text-sm font-semibold text-white">{title}</p>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: string; small?: boolean }> = ({ icon, label, value, small }) => (
  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-center gap-1.5 mb-1 text-[#52b788]">{icon}<span className="text-[10px] text-[#6e7681]">{label}</span></div>
    <p className={cn('font-semibold text-white', small ? 'text-xs' : 'text-sm')}>{value}</p>
  </div>
);

const InfoCard: React.FC<{ icon: string; label: string; value: string; small?: boolean }> = ({ icon, label, value, small }) => (
  <div className="rounded-xl p-3" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
    <p className="text-xs mb-1" style={{ color: '#6e7681' }}>{icon} {label}</p>
    <p className={cn('font-medium text-white', small ? 'text-xs' : 'text-sm')}>{value}</p>
  </div>
);

const ComplianceBadge: React.FC<{ icon: string; title: string; desc: string; ok?: boolean; color: string }> = ({ icon, title, desc, ok, color }) => (
  <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: ok ? `${color}0d` : '#161b22', border: `1px solid ${ok ? color + '30' : 'rgba(255,255,255,0.06)'}` }}>
    <span className="text-2xl flex-shrink-0">{icon}</span>
    <div className="flex-1">
      <p className="font-semibold text-sm" style={{ color: ok ? color : '#c9d1d9' }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: '#8b949e' }}>{desc}</p>
    </div>
    <div className="flex-shrink-0 mt-0.5">
      {ok
        ? <CheckCircle size={18} style={{ color }} />
        : <AlertTriangle size={18} className="text-[#6e7681]" />
      }
    </div>
  </div>
);

const LotProgressBar: React.FC<{ status: string; lang: 'fr' | 'en' }> = ({ status, lang }) => {
  const steps = lang === 'fr'
    ? ['Récolte', 'Transformation', 'Contrôle', 'Transit', 'Exporté']
    : ['Harvest', 'Processing', 'Quality', 'Transit', 'Exported'];
  const statusMap: Record<string, number> = { harvest: 0, processing: 1, processed: 2, transit: 3, exported: 4 };
  const current = statusMap[status] ?? 0;

  return (
    <div className="mt-3 px-1">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-3 h-0.5" style={{ background: '#1e2a22' }} />
        <div className="absolute left-0 top-3 h-0.5 transition-all duration-700"
          style={{ background: 'linear-gradient(to right, #22c55e, #52b788)', width: `${(current / 4) * 100}%` }} />
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1 z-10">
            <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
              style={i <= current
                ? { background: '#22c55e', border: '2px solid #22c55e' }
                : { background: '#0d1117', border: '2px solid #2a3a2a' }
              }>
              {i < current && <CheckCircle size={12} className="text-white" />}
              {i === current && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className="text-[9px] text-center" style={{ color: i <= current ? '#52b788' : '#6e7681' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
