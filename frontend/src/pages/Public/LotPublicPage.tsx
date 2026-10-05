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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F5F0E7]">
      <div className="w-12 h-12 rounded-[8px] bg-[#352638] flex items-center justify-center animate-pulse shadow-sm">
        <Leaf size={24} className="text-[#D8DF72]" />
      </div>
      <p className="text-[#70656B] text-sm font-medium">{T('Chargement du passeport numérique...', 'Loading digital passport...')}</p>
    </div>
  );

  // ── Not found ──
  if (error || !lot) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[#F5F0E7]">
      <div className="w-16 h-16 rounded-[8px] bg-[#F8E6E8] border border-[#963C47]/20 flex items-center justify-center">
        <Package size={32} className="text-[#963C47]" />
      </div>
      <p className="text-[#352638] font-serif font-medium text-xl">{T('Lot introuvable', 'Lot not found')}</p>
      <p className="text-[#70656B] text-sm text-center">{T('Ce QR code ne correspond à aucun lot enregistré dans le registre.', 'This QR code does not match any registered lot.')}</p>
    </div>
  );

  const statusCfg = LOT_STATUS[lot.status] ?? LOT_STATUS.harvest;
  const scanCount = lot._count?.scanLogs ?? 0;
  const hasGPS    = !!(lot.harvestLatitude && lot.harvestLongitude);
  const shipment  = lot.shipmentLots?.[0]?.shipment;

  return (
    <div className="min-h-screen bg-[#F5F0E7] text-[#352638] font-sans">

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <header className="bg-[#FFFCF6] border-b border-[#D8CEC4]">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-[#352638] flex items-center justify-center text-[#FFFCF6] font-serif font-bold text-base shadow-xs">
              TA
            </div>
            <div>
              <p className="font-serif font-medium text-[#352638] text-base leading-tight">TraceAgro</p>
              <p className="text-xs text-[#AD5138] font-semibold uppercase tracking-wider">
                {T('Traçabilité certifiée · Madagascar', 'Certified Traceability · Madagascar')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge Vérifié */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5ECD9] border border-[#435432]/20">
              <CheckCircle size={13} className="text-[#435432]" />
              <span className="text-xs font-semibold text-[#435432]">{T('Vérifié', 'Verified')}</span>
            </div>
            {/* Toggle langue */}
            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#FFFCF6] border border-[#D8CEC4] text-[#352638] hover:bg-[#EAE2EB] transition-colors"
            >
              <Globe size={13} className="text-[#AD5138]" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO — Identité du lot                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO — Identité du lot                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-5 pt-6 pb-2">
        <div className="rounded-[8px] p-6 relative overflow-hidden bg-[#FFFCF6] border border-[#D8CEC4] shadow-xs">
          <div className="relative">
            {/* Numéro + produit */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#70656B] mb-1">{T('PASSEPORT NUMÉRIQUE', 'DIGITAL PASSPORT')}</p>
                <p className="font-mono text-2xl font-bold text-[#352638]">{lot.lotNumber}</p>
                <p className="text-lg font-serif font-medium text-[#352638] mt-0.5">{lot.product?.name}</p>
                <p className="text-xs text-[#70656B] mt-0.5">{lot.product?.category}</p>
              </div>
              {/* Score qualité */}
              {lot.qualityScore && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center bg-[#E5ECD9] border-2 border-[#435432]">
                    <span className="text-xl font-bold font-mono text-[#435432]">
                      {lot.qualityScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-[#70656B]">/10</span>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#70656B] mt-1">{T('Qualité', 'Quality')}</p>
                </div>
              )}
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={<Scale size={14} />} label={T('Quantité', 'Quantity')} value={`${lot.quantityKg} kg`} />
              <MiniStat icon={<Calendar size={14} />} label={T('Récolte', 'Harvest')} value={formatDate(lot.harvestDate, lang)} small />
              <div className="rounded-[6px] p-3 text-center bg-[#F5F0E7] border border-[#D8CEC4]">
                <p className="text-xs font-bold text-[#352638]">{statusCfg.label}</p>
                <p className="text-[10px] uppercase font-semibold text-[#70656B] mt-0.5">Statut</p>
              </div>
            </div>

            {/* Badge Anti-Contrefaçon & compteur de scans */}
            <div className="mt-4 pt-3 border-t border-[#D8CEC4]/60 flex flex-wrap items-center gap-2">
              {/* Badge Authentifié */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E5ECD9] border border-[#435432]/30 text-[#435432]">
                <Shield size={12} />
                <span>{T('Authentifié TraceAgro', 'TraceAgro Authenticated')}</span>
              </div>

              {/* Compteur scans */}
              {scanCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F5F0E7] border border-[#D8CEC4] text-[#70656B]">
                  <Eye size={12} />
                  <span>{scanCount} {T('consultation(s)', 'consultation(s)')}</span>
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="flex-shrink-0 px-4 py-2.5 rounded-[6px] text-xs font-semibold transition-all duration-150"
              style={tab === i
                ? { background: '#352638', color: '#FFFCF6', border: '1px solid #352638' }
                : { background: '#FFFCF6', color: '#70656B', border: '1px solid #D8CEC4' }
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
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#EAE2EB] border border-[#D8CEC4]">
                    <Users size={32} className="text-[#352638] opacity-60" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-serif font-bold text-[#352638]">{lot.producer?.name}</p>
                  <div className="flex items-center gap-1 mt-1 text-[#70656B]">
                    <MapPin size={13} />
                    <span className="text-sm">{lot.producer?.region}, {lot.producer?.country}</span>
                  </div>
                  {lot.producer?.village && (
                    <p className="text-sm mt-0.5 text-[#70656B]">{T('Village :', 'Village:')} {lot.producer.village}</p>
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
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 relative bg-[#EAE2EB] border-2 border-[#352638]">
                        <span className="text-sm font-bold text-[#352638]">{i + 1}</span>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 rounded-[8px] p-4 mb-1 bg-[#FFFCF6] border border-[#D8CEC4] shadow-xs">
                        <p className="font-semibold text-[#352638]">{step.stepName}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#70656B]">
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
                      className="flex items-center gap-3 rounded-[8px] p-3 transition-colors bg-[#FFFCF6] border border-[#D8CEC4] hover:border-[#AD5138] shadow-xs">
                      <div className="w-9 h-9 rounded-[6px] flex items-center justify-center flex-shrink-0 bg-[#EAE2EB] border border-[#D8CEC4]">
                        <FileCheck size={16} className="text-[#352638]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#352638] truncate">{doc.name}</p>
                        <p className="text-xs text-[#70656B]">{doc.docType}</p>
                      </div>
                      <ExternalLink size={14} className="text-[#70656B]" />
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
              <div className="text-center py-8 text-[#70656B]">
                <Package size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">{T('Aucune expédition associée à ce lot', 'No shipment associated with this lot')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-[8px] p-4 bg-[#FFFCF6] border border-[#D8CEC4] shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono font-bold text-[#AD5138]">{shipment.reference}</p>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[#EAE2EB] text-[#352638] border border-[#D8CEC4]">
                      {shipment.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 rounded-[6px] p-2.5 text-center bg-[#F5F0E7] border border-[#D8CEC4]">
                      <p className="text-xs mb-0.5 text-[#70656B]">{T('Départ', 'Departure')}</p>
                      <p className="font-semibold text-[#352638] text-xs">{shipment.departureLocation || '—'}</p>
                      {shipment.departureDate && <p className="text-[10px] mt-0.5 text-[#70656B]">{formatDate(shipment.departureDate, lang)}</p>}
                    </div>
                    <ArrowRight size={16} className="flex-shrink-0 text-[#352638]" />
                    <div className="flex-1 rounded-[6px] p-2.5 text-center bg-[#F5F0E7] border border-[#D8CEC4]">
                      <p className="text-xs mb-0.5 text-[#70656B]">{T('Arrivée', 'Arrival')}</p>
                      <p className="font-semibold text-[#352638] text-xs">{shipment.arrivalLocation || '—'}</p>
                      {shipment.actualArrival && <p className="text-[10px] mt-0.5 text-[#70656B]">{formatDate(shipment.actualArrival, lang)}</p>}
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
  <div className="rounded-[8px] overflow-hidden bg-[#FFFCF6] border border-[#D8CEC4] shadow-xs">
    <div className="px-5 py-3.5 border-b border-[#D8CEC4] bg-[#F5F0E7]/60">
      <p className="text-sm font-serif font-medium text-[#352638]">{title}</p>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: string; small?: boolean }> = ({ icon, label, value, small }) => (
  <div className="rounded-[6px] p-3 bg-[#F5F0E7] border border-[#D8CEC4]">
    <div className="flex items-center gap-1.5 mb-1 text-[#AD5138]">{icon}<span className="text-[10px] font-semibold uppercase text-[#70656B]">{label}</span></div>
    <p className={cn('font-serif font-medium text-[#352638]', small ? 'text-xs' : 'text-sm')}>{value}</p>
  </div>
);

const InfoCard: React.FC<{ icon: string; label: string; value: string; small?: boolean }> = ({ icon, label, value, small }) => (
  <div className="rounded-[6px] p-3.5 bg-[#FFFCF6] border border-[#D8CEC4]">
    <p className="text-xs font-semibold text-[#70656B] mb-1">{icon} {label}</p>
    <p className={cn('font-semibold text-[#352638]', small ? 'text-xs' : 'text-sm')}>{value}</p>
  </div>
);

const ComplianceBadge: React.FC<{ icon: string; title: string; desc: string; ok?: boolean; color: string }> = ({ icon, title, desc, ok }) => (
  <div className={cn('rounded-[6px] p-4 flex items-start gap-3 border', ok ? 'bg-[#E5ECD9] border-[#435432]/30 text-[#435432]' : 'bg-[#FFFCF6] border-[#D8CEC4] text-[#70656B]')}>
    <span className="text-2xl flex-shrink-0">{icon}</span>
    <div className="flex-1">
      <p className="font-semibold text-sm text-[#352638]">{title}</p>
      <p className="text-xs mt-1 text-[#70656B]">{desc}</p>
    </div>
    <div className="flex-shrink-0 mt-0.5">
      {ok
        ? <CheckCircle size={18} className="text-[#435432]" />
        : <AlertTriangle size={18} className="text-[#795015]" />
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
    <div className="mt-4 px-2">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-3 right-3 top-3 h-[2px] bg-[#D8CEC4]" />
        <div className="absolute left-3 top-3 h-[2px] transition-all duration-700 bg-[#AD5138]"
          style={{ width: `calc(${(current / 4) * 100}% - 24px)` }} />
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 z-10">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold border-2',
              i === current
                ? 'bg-[#D8DF72] text-[#352638] border-[#352638] shadow-xs'
                : i < current
                ? 'bg-[#352638] text-[#FFFCF6] border-[#352638]'
                : 'bg-[#FFFCF6] text-[#70656B] border-[#D8CEC4]'
            )}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={cn('text-[10px] text-center font-medium', i === current ? 'text-[#352638] font-bold' : 'text-[#70656B]')}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
