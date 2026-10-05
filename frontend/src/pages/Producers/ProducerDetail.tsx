import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Phone, Mail, Leaf, Award, Package,
  Edit3, Trash2, Plus, Star, Calendar, AlertTriangle,
  CheckCircle, Clock, FileText, Camera, BarChart2, Globe
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, ScoreBadge, StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { CERT_TYPE_CONFIG, LOT_STATUS_CONFIG, formatDate, cn } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Fix icône Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Certification {
  id: string;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: string;
  fileUrl?: string;
  notes?: string;
}

interface Lot {
  id: string;
  lotNumber: string;
  status: string;
  quantityKg: number;
  harvestDate: string;
  qualityScore?: number;
  product: { name: string };
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

interface Producer {
  id: string;
  name: string;
  region: string;
  country: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  areaHectares?: number;
  email?: string;
  telephone?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count: { lots: number; certifications: number };
  certifications: Certification[];
  lots: Lot[];
  photos: Photo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper : couleur expiration certification
// ─────────────────────────────────────────────────────────────────────────────
function certExpiryStatus(expiresAt: string): { label: string; color: string; icon: React.ReactNode } {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: 'Expirée',         color: 'text-red-400',     icon: <AlertTriangle size={13} /> };
  if (days <= 30) return { label: `Expire dans ${days}j`, color: 'text-orange-400', icon: <Clock size={13} /> };
  if (days <= 60) return { label: `Expire dans ${days}j`, color: 'text-yellow-400', icon: <Clock size={13} /> };
  return { label: `Valide (${days}j)`,  color: 'text-forest-400', icon: <CheckCircle size={13} /> };
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',        label: 'Aperçu',         icon: <Globe size={15} /> },
  { id: 'lots',           label: 'Lots',            icon: <Package size={15} /> },
  { id: 'certifications', label: 'Certifications',  icon: <Award size={15} /> },
  { id: 'photos',         label: 'Photos',          icon: <Camera size={15} /> },
  { id: 'score',          label: 'Score IA',        icon: <BarChart2 size={15} /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const ProducerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Formulaire édition
  const [editForm, setEditForm] = useState<any>({});
  const setEF = (k: string, v: string) => setEditForm((f: any) => ({ ...f, [k]: v }));

  // Formulaire certification
  const [certForm, setCertForm] = useState({
    type: 'organic', issuer: '', issuedAt: '', expiresAt: '', notes: '',
  });
  const setCF = (k: string, v: string) => setCertForm((f) => ({ ...f, [k]: v }));

  // ── Fetch producteur ──────────────────────────────────────────────────────
  const { data: producer, isLoading } = useQuery<Producer>({
    queryKey: ['producer', id],
    queryFn: () => api.get(`/producers/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  // ── Fetch score IA ────────────────────────────────────────────────────────
  const { data: scoreData } = useQuery({
    queryKey: ['producer-score', id],
    queryFn: () => api.get(`/producers/${id}/score`).then((r) => r.data.data),
    enabled: !!id,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMut = useMutation({
    mutationFn: (data: any) => api.put(`/producers/${id}`, data),
    onSuccess: () => { toast.success('Producteur mis à jour ✅'); setEditOpen(false); qc.invalidateQueries({ queryKey: ['producer', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const certMut = useMutation({
    mutationFn: (data: any) => api.post(`/producers/${id}/certifications`, data),
    onSuccess: () => { toast.success('Certification ajoutée ✅'); setCertOpen(false); qc.invalidateQueries({ queryKey: ['producer', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/producers/${id}`),
    onSuccess: () => { toast.success('Producteur supprimé'); navigate('/producers'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) return <PageLoader />;
  if (!producer)  return <div className="p-8 text-gray-400">Producteur introuvable.</div>;

  const openEdit = () => {
    setEditForm({
      name: producer.name, region: producer.region, village: producer.village || '',
      latitude: producer.latitude?.toString() || '', longitude: producer.longitude?.toString() || '',
      areaHectares: producer.areaHectares?.toString() || '',
      email: producer.email || '', telephone: producer.telephone || '',
      description: producer.description || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({
      ...editForm,
      latitude:     editForm.latitude     ? parseFloat(editForm.latitude)     : null,
      longitude:    editForm.longitude    ? parseFloat(editForm.longitude)    : null,
      areaHectares: editForm.areaHectares ? parseFloat(editForm.areaHectares) : null,
    });
  };

  const handleCert = (e: React.FormEvent) => {
    e.preventDefault();
    certMut.mutate(certForm);
  };

  // Score couleur
  const score = scoreData?.score;
  const scoreColor = !score ? 'text-[#70656B]' : score >= 8 ? 'text-[#435432]' : score >= 6 ? 'text-[#795015]' : 'text-[#963C47]';
  const scoreRing  = !score ? 'ring-[#D8CEC4]' : score >= 8 ? 'ring-[#435432]' : score >= 6 ? 'ring-[#795015]' : 'ring-[#963C47]';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ── */}
      <Header
        title={producer.name}
        subtitle={`${producer.region}, ${producer.country}`}
        backTo="/producers"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Edit3 size={14} />} onClick={openEdit}>Modifier</Button>
            <Button variant="danger"    size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>Supprimer</Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">

        {/* ── Bannière infos rapides ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Lots totaux"     value={producer._count.lots}           icon={<Package size={20} />} color="text-[#352638]" />
          <StatCard title="Certifications"  value={producer._count.certifications} icon={<Award size={20} />}   color="text-[#795015]" />
          <StatCard title="Surface"         value={producer.areaHectares ? `${producer.areaHectares} ha` : '—'} icon={<Leaf size={20} />} color="text-[#435432]" />
          <div className="card p-4 flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-full ring-2 flex items-center justify-center flex-shrink-0', scoreRing)}>
              <span className={cn('text-lg font-bold font-serif', scoreColor)}>{score ? score.toFixed(1) : '—'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#70656B]">Score IA</p>
              <p className={cn('text-xs mt-0.5 font-medium', scoreColor)}>{!score ? 'N/A' : score >= 8 ? 'Excellent' : score >= 6 ? 'Bon' : 'À améliorer'}</p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-[6px] transition-all',
                tab === t.id
                  ? 'bg-[#352638] text-[#FFFCF6]'
                  : 'text-[#70656B] hover:text-[#352638] hover:bg-[#F5F0E7]'
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB : APERÇU                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Informations */}
            <Card>
              <CardHeader title="Informations" icon={<Globe size={16} />} />
              <div className="space-y-3 text-sm">
                <InfoRow icon={<MapPin size={14} />}  label="Région"    value={producer.region} />
                {producer.village    && <InfoRow icon={<MapPin size={14} />}   label="Village"   value={producer.village} />}
                {producer.telephone  && <InfoRow icon={<Phone size={14} />}    label="Téléphone" value={producer.telephone} />}
                {producer.email      && <InfoRow icon={<Mail size={14} />}     label="Email"     value={producer.email} />}
                {producer.areaHectares && <InfoRow icon={<Leaf size={14} />}   label="Surface"   value={`${producer.areaHectares} hectares`} />}
                {(producer.latitude && producer.longitude) && (
                  <InfoRow icon={<Globe size={14} />} label="GPS"
                    value={`${producer.latitude.toFixed(5)}, ${producer.longitude.toFixed(5)}`} />
                )}
                <InfoRow icon={<Calendar size={14} />} label="Inscrit le" value={formatDate(producer.createdAt)} />
                {producer.description && (
                  <div className="mt-3 pt-3 border-t border-[#D8CEC4]">
                    <p className="text-[#70656B] text-xs mb-1 font-semibold">Description</p>
                    <p className="text-[#352638] leading-relaxed">{producer.description}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Carte géographique */}
            {producer.latitude && producer.longitude ? (
              <Card className="overflow-hidden p-0">
                <div className="p-4 border-b border-[#D8CEC4]">
                  <p className="text-sm font-semibold text-[#352638]">Localisation GPS</p>
                  <p className="text-xs text-[#70656B]">{producer.village || producer.region}, Madagascar</p>
                </div>
                <div className="h-64">
                  <MapContainer
                    center={[producer.latitude, producer.longitude]}
                    zoom={11}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap"
                    />
                    <Marker position={[producer.latitude, producer.longitude]}>
                      <Popup>
                        <strong>{producer.name}</strong><br />
                        {producer.region}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin size={32} className="text-[#70656B] mb-3" />
                <p className="text-[#70656B] text-sm">Aucune coordonnée GPS</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={openEdit}>Ajouter les coordonnées</Button>
              </Card>
            )}

            {/* Certifications résumé */}
            <Card className="lg:col-span-2">
              <CardHeader title="Certifications actives" subtitle={`${producer.certifications.length} au total`} />
              {producer.certifications.length === 0 ? (
                <p className="text-[#70656B] text-sm text-center py-4">Aucune certification enregistrée.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {producer.certifications.map((c: any) => {
                    const cfg = CERT_TYPE_CONFIG[c.type] ?? { label: c.type, emoji: '📋' };
                    const exp = certExpiryStatus(c.expiresAt);
                    return (
                      <div key={c.id} className="flex items-center gap-2 bg-[#F5F0E7] rounded-[8px] px-4 py-2.5 border border-[#D8CEC4]">
                        <span className="text-xl">{cfg.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#352638]">{cfg.label}</p>
                          <p className="text-xs text-[#70656B]">{c.issuer}</p>
                        </div>
                        <div className={cn('flex items-center gap-1 text-xs ml-3 font-medium', exp.color)}>
                          {exp.icon}{exp.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB : LOTS                                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'lots' && (
          <Card>
            <CardHeader
              title="Lots de production"
              subtitle={`${producer.lots.length} lots récents`}
              action={<Button size="sm" icon={<Plus size={13} />} onClick={() => navigate('/lots')}>Nouveau lot</Button>}
            />
            {producer.lots.length === 0 ? (
              <div className="text-center py-10">
                <Package size={36} className="mx-auto text-[#70656B] mb-3" />
                <p className="text-[#70656B]">Aucun lot enregistré pour ce producteur.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D8CEC4] bg-[#F5F0E7] text-[#70656B] text-xs uppercase tracking-wide">
                      <th className="text-left py-2 pr-4 font-semibold">N° Lot</th>
                      <th className="text-left py-2 pr-4 font-semibold">Produit</th>
                      <th className="text-left py-2 pr-4 font-semibold">Statut</th>
                      <th className="text-left py-2 pr-4 font-semibold">Quantité</th>
                      <th className="text-left py-2 pr-4 font-semibold">Date récolte</th>
                      <th className="text-left py-2 font-semibold">Score qualité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8CEC4]">
                    {producer.lots.map((lot: any) => {
                      const sc = LOT_STATUS_CONFIG[lot.status] ?? { label: lot.status, color: 'text-[#70656B]', bg: 'bg-[#EAE2EB]' };
                      return (
                        <tr
                          key={lot.id}
                          className="hover:bg-[#F5F0E7] cursor-pointer transition-colors"
                          onClick={() => navigate(`/lots/${lot.id}`)}
                        >
                          <td className="py-3 pr-4 font-mono text-[#AD5138] font-semibold hover:underline">{lot.lotNumber}</td>
                          <td className="py-3 pr-4 text-[#352638]">{lot.product?.name ?? '—'}</td>
                          <td className="py-3 pr-4"><StatusBadge config={sc} /></td>
                          <td className="py-3 pr-4 text-[#352638] font-medium tabular-nums">{lot.quantityKg} kg</td>
                          <td className="py-3 pr-4 text-[#70656B]">{formatDate(lot.harvestDate)}</td>
                          <td className="py-3"><ScoreBadge score={lot.qualityScore} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB : CERTIFICATIONS                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'certifications' && (
          <Card>
            <CardHeader
              title="Certifications"
              subtitle="Gérez les certifications du producteur"
              action={<Button size="sm" icon={<Plus size={13} />} onClick={() => setCertOpen(true)}>Ajouter</Button>}
            />
            {producer.certifications.length === 0 ? (
              <div className="text-center py-10">
                <Award size={36} className="mx-auto text-[#70656B] mb-3" />
                <p className="text-[#70656B] mb-3">Aucune certification enregistrée.</p>
                <Button size="sm" icon={<Plus size={13} />} onClick={() => setCertOpen(true)}>Ajouter une certification</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {producer.certifications.map((c: any) => {
                  const cfg = CERT_TYPE_CONFIG[c.type] ?? { label: c.type, emoji: '📋' };
                  const exp = certExpiryStatus(c.expiresAt);
                  return (
                    <div key={c.id} className="flex items-center gap-4 bg-[#FFFCF6] rounded-[8px] p-4 border border-[#D8CEC4] shadow-xs">
                      <span className="text-3xl">{cfg.emoji}</span>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-[#70656B] mb-0.5 font-semibold">Type</p>
                          <p className="text-sm font-semibold text-[#352638]">{cfg.label}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#70656B] mb-0.5 font-semibold">Organisme</p>
                          <p className="text-sm text-[#352638]">{c.issuer}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#70656B] mb-0.5 font-semibold">Émise le</p>
                          <p className="text-sm text-[#352638]">{formatDate(c.issuedAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#70656B] mb-0.5 font-semibold">Expiration</p>
                          <div className={cn('flex items-center gap-1 text-sm font-medium', exp.color)}>
                            {exp.icon} {formatDate(c.expiresAt)}
                          </div>
                        </div>
                      </div>
                      <div className={cn('text-xs px-3 py-1 rounded-full border font-semibold', exp.color,
                        exp.label.includes('Expirée') ? 'border-[#963C47]/30 bg-[#F8E6E8]' :
                        exp.label.includes('30j') || exp.label.includes('60j') ? 'border-[#795015]/30 bg-[#F5E8CC]' :
                        'border-[#435432]/30 bg-[#E5ECD9]'
                      )}>
                        {exp.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB : PHOTOS                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'photos' && (
          <Card>
            <CardHeader title="Galerie photos" subtitle={`${producer.photos.length} photo(s)`} />
            {producer.photos.length === 0 ? (
              <div className="text-center py-10">
                <Camera size={36} className="mx-auto text-[#70656B] mb-3" />
                <p className="text-[#70656B]">Aucune photo enregistrée.</p>
                <p className="text-xs text-[#70656B] mt-1">Utilisez l'application mobile pour ajouter des photos terrain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {producer.photos.map((photo: any) => (
                  <div key={photo.id} className="group relative rounded-[8px] overflow-hidden aspect-square bg-[#EAE2EB] border border-[#D8CEC4]">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Photo producteur'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB : SCORE IA                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'score' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Score global */}
            <Card className="flex flex-col items-center justify-center py-10">
              <div className={cn('w-28 h-28 rounded-full ring-4 flex flex-col items-center justify-center', scoreRing)}>
                <span className={cn('text-4xl font-bold font-serif', scoreColor)}>
                  {score ? score.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-[#70656B]">/10</span>
              </div>
              <p className="mt-4 text-lg font-serif font-bold text-[#352638]">Score IA Global</p>
              <p className={cn('text-sm mt-1 font-semibold', scoreColor)}>
                {!score ? 'Données insuffisantes' : score >= 8 ? '⭐ Producteur Excellent' : score >= 6 ? '✅ Bon producteur' : '⚠️ À améliorer'}
              </p>
            </Card>

            {/* Détail du score */}
            <Card>
              <CardHeader title="Détail du calcul" subtitle="Comment le score est calculé" />
              <div className="space-y-4">
                <ScoreBar label="Qualité moyenne des lots" value={scoreData?.avgQuality ?? 0} max={10} color="bg-[#435432]" />
                <ScoreBar label="Bonus certifications actives" value={Math.min((scoreData?.activeCertifications ?? 0) * 0.5, 2)} max={2} color="bg-[#795015]" />
                <ScoreBar label="Bonus volume (lots)" value={Math.min((scoreData?.totalLots ?? 0) * 0.1, 1)} max={1} color="bg-[#352638]" />
                <div className="pt-3 border-t border-[#D8CEC4] space-y-1 text-sm text-[#70656B]">
                  <p>📦 Lots analysés : <span className="text-[#352638] font-semibold">{scoreData?.totalLots ?? 0}</span></p>
                  <p>🏅 Certifications actives : <span className="text-[#352638] font-semibold">{scoreData?.activeCertifications ?? 0}</span></p>
                  <p>📊 Qualité moyenne : <span className="text-[#352638] font-semibold">{scoreData?.avgQuality?.toFixed(1) ?? '—'}/10</span></p>
                </div>
              </div>
            </Card>

            {/* Recommandations IA */}
            <Card className="md:col-span-2">
              <CardHeader title="💡 Recommandations IA" subtitle="Actions suggérées pour améliorer le score" />
              <div className="space-y-2">
                {(!scoreData?.activeCertifications || scoreData.activeCertifications === 0) && (
                  <Recommendation type="warning" text="Aucune certification active — ajoutez une certification EUDR ou Bio pour améliorer la conformité." />
                )}
                {(scoreData?.avgQuality ?? 0) < 7 && (
                  <Recommendation type="info" text="Score qualité inférieur à 7 — améliorez les étapes de transformation et renseignez les scores de qualité." />
                )}
                {(scoreData?.totalLots ?? 0) < 3 && (
                  <Recommendation type="info" text="Peu de lots enregistrés — ajoutez davantage de lots pour affiner l'analyse IA." />
                )}
                {score && score >= 8 && (
                  <Recommendation type="success" text="Excellent score ! Ce producteur est éligible aux marchés premium et aux certifications EUDR avancées." />
                )}
                {score && score >= 6 && score < 8 && (
                  <Recommendation type="success" text="Bon profil. Ajoutez des certifications supplémentaires pour atteindre le niveau Excellent." />
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL : ÉDITION                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Modifier – ${producer.name}`} size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *"><input className="input" value={editForm.name || ''} onChange={(e) => setEF('name', e.target.value)} required /></Field>
            <Field label="Région *"><input className="input" placeholder="SAVA, Analanjirofo..." value={editForm.region || ''} onChange={(e) => setEF('region', e.target.value)} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Village"><input className="input" value={editForm.village || ''} onChange={(e) => setEF('village', e.target.value)} /></Field>
            <Field label="Surface (ha)"><input type="number" step="0.1" className="input" value={editForm.areaHectares || ''} onChange={(e) => setEF('areaHectares', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude GPS"><input type="number" step="any" className="input" placeholder="-14.267" value={editForm.latitude || ''} onChange={(e) => setEF('latitude', e.target.value)} /></Field>
            <Field label="Longitude GPS"><input type="number" step="any" className="input" placeholder="50.167" value={editForm.longitude || ''} onChange={(e) => setEF('longitude', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className="input" value={editForm.email || ''} onChange={(e) => setEF('email', e.target.value)} /></Field>
            <Field label="Téléphone"><input className="input" value={editForm.telephone || ''} onChange={(e) => setEF('telephone', e.target.value)} /></Field>
          </div>
          <Field label="Description">
            <textarea className="input resize-none" rows={3} value={editForm.description || ''} onChange={(e) => setEF('description', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button type="submit" loading={updateMut.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL : CERTIFICATION                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal open={certOpen} onClose={() => setCertOpen(false)} title="Ajouter une certification">
        <form onSubmit={handleCert} className="space-y-4">
          <Field label="Type de certification *">
            <select className="input" value={certForm.type} onChange={(e) => setCF('type', e.target.value)}>
              {Object.entries(CERT_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
              <option value="rainforest">🌧️ Rainforest Alliance</option>
              <option value="other">📋 Autre</option>
            </select>
          </Field>
          <Field label="Organisme émetteur *">
            <input className="input" placeholder="ex. Ecocert, IMO..." value={certForm.issuer} onChange={(e) => setCF('issuer', e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date d'émission *"><input type="date" className="input" value={certForm.issuedAt} onChange={(e) => setCF('issuedAt', e.target.value)} required /></Field>
            <Field label="Date d'expiration *"><input type="date" className="input" value={certForm.expiresAt} onChange={(e) => setCF('expiresAt', e.target.value)} required /></Field>
          </div>
          <Field label="Notes">
            <textarea className="input resize-none" rows={2} value={certForm.notes} onChange={(e) => setCF('notes', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCertOpen(false)}>Annuler</Button>
            <Button type="submit" loading={certMut.isPending}>Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL : SUPPRESSION                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirmer la suppression">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Voulez-vous vraiment supprimer <span className="text-white font-semibold">{producer.name}</span> ?<br />
              <span className="text-red-400 text-xs">Cette action est irréversible. Impossible si des lots sont associés.</span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="danger" onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}>Supprimer définitivement</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Petits composants internes
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-[#70656B] flex-shrink-0">{icon}</span>
    <span className="text-[#70656B] w-24 flex-shrink-0 text-xs font-semibold">{label}</span>
    <span className="text-[#352638] font-medium">{value}</span>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-[#352638] mb-1.5">{label}</label>
    {children}
  </div>
);

const ScoreBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-[#70656B] font-medium">{label}</span>
      <span className="text-[#352638] font-mono font-semibold">{value.toFixed(1)}/{max}</span>
    </div>
    <div className="h-2 bg-[#EAE2EB] rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

const Recommendation: React.FC<{ type: 'warning' | 'info' | 'success'; text: string }> = ({ type, text }) => {
  const styles = {
    warning: 'bg-[#F5E8CC] border-[#795015]/30 text-[#795015]',
    info:    'bg-[#EAE2EB] border-[#352638]/20 text-[#352638]',
    success: 'bg-[#E5ECD9] border-[#435432]/30 text-[#435432]',
  };
  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-[6px] border text-sm font-medium', styles[type])}>
      <span className="flex-shrink-0 mt-0.5">{type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <span>{text}</span>
    </div>
  );
};
