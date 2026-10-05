import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ship, Package, FileText, QrCode, MapPin,
  Calendar, Truck, Container, Plus, Trash2, Download,
  ExternalLink, CheckCircle, Clock, AlertCircle, RefreshCw,
  Globe, BarChart3, Camera
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge, ScoreBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { SHIPMENT_STATUS_CONFIG, LOT_STATUS_CONFIG, DOC_TYPE_CONFIG, CERT_TYPE_CONFIG, formatDate } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

/* ── petits helpers ─────────────────────────────────────────────────────── */
const Pill: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-[#352638]' }) => (
  <div className="flex flex-col">
    <span className="text-xs text-[#70656B] mb-0.5">{label}</span>
    <span className={`text-sm font-medium ${color}`}>{value}</span>
  </div>
);

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[6px] transition-all ${
      active ? 'bg-[#352638] text-[#FFFCF6]' : 'text-[#70656B] hover:text-[#352638] hover:bg-[#F5F0E7]'
    }`}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? 'bg-[#D8DF72] text-[#352638]' : 'bg-[#EAE2EB] text-[#70656B]'}`}>
        {count}
      </span>
    )}
  </button>
);

/* ── statut badge couleur ───────────────────────────────────────────────── */
const statusIcon = (status: string) => {
  if (status === 'delivered') return <CheckCircle size={14} className="text-forest-400" />;
  if (status === 'in_transit') return <Truck size={14} className="text-blue-400" />;
  if (status === 'cancelled') return <AlertCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-vanilla-400" />;
};

/* ══════════════════════════════════════════════════════════════════════════ */
export const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'lots' | 'documents' | 'qr' | 'analytics'>('overview');
  const [addLotOpen, setAddLotOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addLotIds, setAddLotIds] = useState('');
  const [docForm, setDocForm] = useState({ name: '', docType: 'phytosanitary', fileUrl: '', notes: '' });
  const [editForm, setEditForm] = useState<any>(null);

  /* ── data ─────────────────────────────────────────────────────────────── */
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => api.get(`/shipments/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: availableLots } = useQuery({
    queryKey: ['lots-available'],
    queryFn: async () => {
      // Récupérer les lots ET les ordres de conditionnement terminés
      const [lotsRes, condRes] = await Promise.all([
        api.get('/lots', { params: { limit: 100 } }),
        api.get('/conditioning', { params: { status: 'termine' } }),
      ]);
      const allLots = lotsRes.data.data ?? [];
      const conditionedLotIds = new Set(
        (condRes.data.data ?? []).map((order: any) => order.lotId)
      );
      // Retourner seulement les lots ayant un conditionnement terminé
      return allLots.filter((lot: any) => conditionedLotIds.has(lot.id));
    },
  });

  /* ── actions ──────────────────────────────────────────────────────────── */
  const updateStatus = async (status: string) => {
    try {
      await api.patch(`/shipments/${id}/status`, { status });
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['shipment', id] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const addLots = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ids = addLotIds.split(',').map(s => s.trim()).filter(Boolean);
      await api.post(`/shipments/${id}/lots`, { lotIds: ids });
      toast.success(`${ids.length} lot(s) ajouté(s)`);
      setAddLotOpen(false);
      setAddLotIds('');
      qc.invalidateQueries({ queryKey: ['shipment', id] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const removeLot = async (lotId: string) => {
    try {
      await api.delete(`/shipments/${id}/lots/${lotId}`);
      toast.success('Lot retiré');
      qc.invalidateQueries({ queryKey: ['shipment', id] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const addDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents', { ...docForm, shipmentId: id });
      toast.success('Document ajouté');
      setAddDocOpen(false);
      setDocForm({ name: '', docType: 'phytosanitary', fileUrl: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['shipment', id] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/shipments/${id}`, editForm);
      toast.success('Expédition mise à jour');
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ['shipment', id] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const deleteShipment = async () => {
    try {
      await api.delete(`/shipments/${id}`);
      toast.success('Expédition supprimée');
      navigate('/shipments');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const downloadQR = () => {
    if (!shipment?.qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = shipment.qrCodeUrl;
    a.download = `QR-${shipment.reference}.png`;
    a.click();
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/shipment-public/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié !');
  };

  if (isLoading) return <PageLoader />;
  if (!shipment) return <div className="p-8 text-gray-400">Expédition introuvable</div>;

  const cfg = SHIPMENT_STATUS_CONFIG[shipment.status] ?? SHIPMENT_STATUS_CONFIG.preparing;
  const lots = shipment.shipmentLots?.map((sl: any) => sl.lot) ?? [];
  const docs = shipment.documents ?? [];
  const totalQty = lots.reduce((acc: number, l: any) => acc + (l?.actualQuantity || l?.expectedQuantity || 0), 0);
  const avgScore = lots.length ? (lots.reduce((a: number, l: any) => a + (l?.qualityScore || 0), 0) / lots.length).toFixed(1) : '—';

  /* ═══════════════════════════════════════════════ RENDER ═══════════════ */
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={shipment.reference}
        subtitle={`${shipment.carrierName} · ${shipment.departureLocation} → ${shipment.arrivalLocation}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')} icon={<ArrowLeft size={14} />}>
              Retour
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditForm({ ...shipment }); setEditOpen(true); }}>
              Modifier
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Supprimer
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 animate-fade-in">

        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <Card className="border border-[#D8CEC4] overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-6">

            {/* Gauche */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[8px] bg-[#EAE2EB] border border-[#D8CEC4] flex items-center justify-center text-[#352638]">
                <Ship size={24} className="text-[#352638]" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-[#352638]">{shipment.reference}</h2>
                <p className="text-sm text-[#70656B] mt-0.5">{shipment.carrierName}</p>
                <div className="flex items-center gap-2 mt-2">
                  {statusIcon(shipment.status)}
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="flex flex-wrap gap-6">
              <Pill label="Conteneur" value={shipment.containerNumber || '—'} color="text-[#352638] font-mono" />
              <Pill label="Lots" value={String(lots.length)} />
              <Pill label="Quantité totale" value={`${totalQty.toFixed(1)} kg`} />
              <Pill label="Score moyen" value={`${avgScore}/10`} color={parseFloat(avgScore) >= 8 ? 'text-[#435432]' : parseFloat(avgScore) >= 6 ? 'text-[#795015]' : 'text-[#963C47]'} />
              <Pill label="Départ" value={shipment.departureDate ? formatDate(shipment.departureDate) : '—'} />
              <Pill label="Arrivée prévue" value={shipment.expectedArrival ? formatDate(shipment.expectedArrival) : '—'} />
            </div>

            {/* Actions statut */}
            <div className="flex flex-col gap-2">
              {shipment.status === 'preparing' && (
                <Button size="sm" onClick={() => updateStatus('in_transit')} icon={<Truck size={14} />}>
                  Mettre en transit
                </Button>
              )}
              {shipment.status === 'in_transit' && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus('delivered')} icon={<CheckCircle size={14} />}>
                  Marquer livré
                </Button>
              )}
              {shipment.status !== 'cancelled' && shipment.status !== 'delivered' && (
                <Button size="sm" variant="ghost" onClick={() => updateStatus('cancelled')} icon={<AlertCircle size={14} />}>
                  Annuler
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar livraison */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-[#70656B] mb-1.5 font-medium">
              <span>🏭 En préparation</span>
              <span>🚢 En transit</span>
              <span>✅ Livré</span>
            </div>
            <div className="h-2 bg-[#EAE2EB] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  shipment.status === 'preparing' ? 'w-1/3 bg-[#795015]' :
                  shipment.status === 'in_transit' ? 'w-2/3 bg-[#352638]' :
                  shipment.status === 'delivered' ? 'w-full bg-[#435432]' : 'w-0'
                }`}
              />
            </div>
          </div>
        </Card>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4]">
          <TabBtn active={tab === 'overview'}   onClick={() => setTab('overview')}   icon={<Ship size={14} />}     label="Aperçu" />
          <TabBtn active={tab === 'lots'}       onClick={() => setTab('lots')}       icon={<Package size={14} />}  label="Lots"       count={lots.length} />
          <TabBtn active={tab === 'documents'}  onClick={() => setTab('documents')}  icon={<FileText size={14} />} label="Documents"  count={docs.length} />
          <TabBtn active={tab === 'qr'}         onClick={() => setTab('qr')}         icon={<QrCode size={14} />}   label="QR Expédition" />
          <TabBtn active={tab === 'analytics'}  onClick={() => setTab('analytics')}  icon={<BarChart3 size={14} />} label="Analytics" />
        </div>

        {/* ════════════════ TAB: APERÇU ════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Infos logistiques */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader title="Informations logistiques" subtitle="Détails du transport" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <InfoRow icon={<Truck size={14} />}     label="Transporteur"     value={shipment.carrierName} />
                  <InfoRow icon={<Container size={14} />} label="N° Conteneur"     value={shipment.containerNumber || '—'} mono />
                  <InfoRow icon={<MapPin size={14} />}    label="Port de départ"   value={shipment.departureLocation} />
                  <InfoRow icon={<MapPin size={14} />}    label="Port d'arrivée"   value={shipment.arrivalLocation} />
                  <InfoRow icon={<Calendar size={14} />}  label="Date départ"      value={shipment.departureDate ? formatDate(shipment.departureDate) : '—'} />
                  <InfoRow icon={<Calendar size={14} />}  label="Arrivée prévue"   value={shipment.expectedArrival ? formatDate(shipment.expectedArrival) : '—'} />
                  {shipment.actualArrival && (
                    <InfoRow icon={<CheckCircle size={14} />} label="Arrivée réelle" value={formatDate(shipment.actualArrival)} color="text-[#435432]" />
                  )}
                  {shipment.depot && (
                    <InfoRow icon={<MapPin size={14} />}  label="Dépôt"             value={shipment.depot} />
                  )}
                </div>
                {shipment.notes && (
                  <div className="mt-4 p-3 bg-[#F5F0E7] rounded-[6px] border border-[#D8CEC4]">
                    <p className="text-xs text-[#70656B] mb-1">Notes</p>
                    <p className="text-sm text-[#352638]">{shipment.notes}</p>
                  </div>
                )}
              </Card>

              {/* Récap lots */}
              <Card>
                <CardHeader title="Récapitulatif des lots" subtitle={`${lots.length} lot(s) · ${totalQty.toFixed(1)} kg`} />
                {lots.length === 0 ? (
                  <p className="text-sm text-[#70656B] mt-4">Aucun lot associé</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {lots.slice(0, 6).map((lot: any) => (
                      <div key={lot.id} className="p-3 bg-[#FFFCF6] rounded-[6px] border border-[#D8CEC4] hover:border-[#AD5138] transition-colors cursor-pointer" onClick={() => navigate(`/lots/${lot.id}`)}>
                        <p className="text-xs font-mono font-medium text-[#AD5138]">{lot.lotNumber}</p>
                        <p className="text-xs text-[#70656B] mt-0.5">{lot.product?.name}</p>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-xs text-[#70656B] tabular-nums">{lot.actualQuantity || lot.expectedQuantity || 0} kg</span>
                          {lot.qualityScore && <ScoreBadge score={lot.qualityScore} />}
                        </div>
                      </div>
                    ))}
                    {lots.length > 6 && (
                      <div className="p-3 bg-[#F5F0E7] rounded-[6px] border border-dashed border-[#D8CEC4] flex items-center justify-center cursor-pointer hover:border-[#AD5138]" onClick={() => setTab('lots')}>
                        <span className="text-xs text-[#70656B]">+{lots.length - 6} lots →</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Colonne droite */}
            <div className="space-y-4">
              {/* QR mini */}
              <Card className="text-center">
                <CardHeader title="QR Code Expédition" />
                {shipment.qrCodeUrl ? (
                  <div className="mt-4 space-y-3">
                    <div className="w-32 h-32 mx-auto rounded-[8px] overflow-hidden border border-[#D8CEC4] bg-white p-2">
                      <img src={shipment.qrCodeUrl} alt="QR" className="w-full h-full" />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="secondary" onClick={downloadQR} icon={<Download size={12} />}>PNG</Button>
                      <Button size="sm" variant="ghost" onClick={copyPublicUrl} icon={<Globe size={12} />}>Lien</Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(`/shipment-public/${id}`, '_blank')} icon={<ExternalLink size={12} />}>Voir</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#70656B] mt-4">QR non généré</p>
                )}
              </Card>

              {/* Documents importants */}
              <Card>
                <CardHeader title="Documents" action={<Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setAddDocOpen(true)}>Ajouter</Button>} />
                {docs.length === 0 ? (
                  <p className="text-sm text-[#70656B] mt-4">Aucun document</p>
                ) : (
                  <div className="space-y-2 mt-4">
                    {docs.slice(0, 5).map((doc: any) => {
                      const dc = DOC_TYPE_CONFIG[doc.docType];
                      return (
                        <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-[6px] bg-[#F5F0E7] hover:bg-[#EAE2EB] transition-colors">
                          <span className="text-base">{dc?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#352638] truncate">{doc.name}</p>
                            <p className="text-xs text-[#70656B]">{dc?.label}</p>
                          </div>
                          <ExternalLink size={12} className="text-[#70656B] flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ════════════════ TAB: LOTS ═════════════════════════════════ */}
        {tab === 'lots' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#70656B]">{lots.length} lot(s) · {totalQty.toFixed(1)} kg · Score moyen : {avgScore}/10</p>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddLotOpen(true)}>Ajouter des lots</Button>
            </div>
            {lots.length === 0 ? (
              <Card><p className="text-center text-[#70656B] py-8">Aucun lot associé à cette expédition</p></Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D8CEC4] bg-[#F5F0E7]">
                      {['Lot', 'Produit', 'Producteur', 'Région', 'Quantité', 'Score', 'Statut', ''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs text-[#70656B] font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot: any) => {
                      const lc = LOT_STATUS_CONFIG[lot.status];
                      return (
                        <tr key={lot.id} className="border-b border-[#D8CEC4] hover:bg-[#F5F0E7] transition-colors">
                          <td className="py-3 px-4">
                            <button onClick={() => navigate(`/lots/${lot.id}`)} className="font-mono text-xs font-semibold text-[#AD5138] hover:underline">{lot.lotNumber}</button>
                          </td>
                          <td className="py-3 px-4 text-[#352638] text-xs">{lot.product?.name}</td>
                          <td className="py-3 px-4 text-[#70656B] text-xs">{lot.producer?.name}</td>
                          <td className="py-3 px-4 text-[#70656B] text-xs">{lot.producer?.region}</td>
                          <td className="py-3 px-4 text-[#352638] text-xs font-medium tabular-nums">{(lot.actualQuantity || lot.expectedQuantity || 0).toFixed(1)} kg</td>
                          <td className="py-3 px-4">{lot.qualityScore ? <ScoreBadge score={lot.qualityScore} /> : '—'}</td>
                          <td className="py-3 px-4">{lc && <StatusBadge config={lc} />}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => removeLot(lot.id)} className="text-[#963C47] hover:text-[#AD5138] transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* ════════════════ TAB: DOCUMENTS ════════════════════════════ */}
        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#70656B]">{docs.length} document(s)</p>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddDocOpen(true)}>Ajouter un document</Button>
            </div>

            {/* Catégories EUDR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]: [string, any]) => {
                const count = docs.filter((d: any) => d.docType === key).length;
                return (
                  <div key={key} className={`p-3 rounded-[8px] border ${count > 0 ? 'border-[#352638] bg-[#FFFCF6]' : 'border-[#D8CEC4] bg-[#FFFCF6]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{cfg.emoji}</span>
                      <span className={`text-lg font-serif font-bold ${count > 0 ? 'text-[#352638]' : 'text-[#70656B]'}`}>{count}</span>
                    </div>
                    <p className="text-xs text-[#70656B] mt-1 leading-tight">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {docs.length === 0 ? (
              <Card><p className="text-center text-[#70656B] py-8">Aucun document attaché à cette expédition</p></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map((doc: any) => {
                  const dc = DOC_TYPE_CONFIG[doc.docType];
                  return (
                    <div key={doc.id} className="flex items-start gap-3 p-4 bg-[#FFFCF6] rounded-[8px] border border-[#D8CEC4] hover:border-[#AD5138] transition-colors shadow-xs">
                      <div className="w-10 h-10 rounded-[6px] bg-[#EAE2EB] flex items-center justify-center text-xl flex-shrink-0">{dc?.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#352638] truncate">{doc.name}</p>
                        <p className="text-xs text-[#70656B]">{dc?.label} · {formatDate(doc.createdAt)}</p>
                        {doc.notes && <p className="text-xs text-[#70656B] mt-1 truncate italic">{doc.notes}</p>}
                      </div>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                        <Button size="sm" variant="ghost" icon={<ExternalLink size={12} />}>Voir</Button>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB: QR EXPÉDITION ════════════════════════ */}
        {tab === 'qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* QR Code */}
            <Card>
              <CardHeader title="QR Code · Passeport Numérique Expédition" subtitle="Innovation #7 — QR unique par conteneur" />
              <div className="mt-6 flex flex-col items-center space-y-6">
                {shipment.qrCodeUrl ? (
                  <>
                    <div className="p-4 bg-white rounded-[8px] shadow-sm border border-[#D8CEC4]">
                      <img src={shipment.qrCodeUrl} alt={`QR ${shipment.reference}`} className="w-48 h-48" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#352638]">{shipment.reference}</p>
                      <p className="text-xs text-[#70656B] font-mono mt-1">{`${window.location.origin}/shipment-public/${id}`}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button onClick={downloadQR} icon={<Download size={14} />}>Télécharger PNG</Button>
                      <Button variant="secondary" onClick={copyPublicUrl} icon={<Globe size={14} />}>Copier le lien</Button>
                      <Button variant="ghost" onClick={() => window.open(`/shipment-public/${id}`, '_blank')} icon={<ExternalLink size={14} />}>Ouvrir la page publique</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <QrCode size={48} className="mx-auto text-[#70656B] mb-4" />
                    <p className="text-[#70656B] mb-4">QR Code non encore généré</p>
                    <Button icon={<RefreshCw size={14} />}>Générer le QR</Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Ce que voit le destinataire */}
            <Card>
              <CardHeader title="Contenu de la page publique" subtitle="Ce que voit l'acheteur / le douanier" />
              <div className="mt-4 space-y-3">
                {[
                  { icon: '🚢', label: 'Référence & statut en temps réel', detail: shipment.reference },
                  { icon: '📦', label: `${lots.length} lots inclus`, detail: `${totalQty.toFixed(1)} kg total` },
                  { icon: '🗺️', label: 'Itinéraire', detail: `${shipment.departureLocation} → ${shipment.arrivalLocation}` },
                  { icon: '📄', label: `${docs.length} documents vérifiables`, detail: 'Phytosanitaire, EUDR, Bio...' },
                  { icon: '🌿', label: 'Conformité EUDR', detail: lots.length > 0 ? 'GPS parcelles inclus' : 'En attente de lots' },
                  { icon: '🔐', label: 'Anti-contrefaçon', detail: 'Compteur de scans + empreinte geo' },
                  { icon: '📊', label: 'Score qualité moyen', detail: `${avgScore}/10` },
                  { icon: '🌍', label: 'Multilingue FR/EN', detail: 'Adapté aux acheteurs internationaux' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#F5F0E7] rounded-[6px] border border-[#D8CEC4]">
                    <span className="text-base">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#352638]">{item.label}</p>
                      <p className="text-xs text-[#70656B]">{item.detail}</p>
                    </div>
                    <CheckCircle size={14} className="text-[#435432] ml-auto mt-0.5 flex-shrink-0" />
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-[#FFFCF6] border border-[#D8CEC4] rounded-[6px]">
                <p className="text-xs text-[#AD5138] font-semibold">💡 Innovation #7 — QR Expédition</p>
                <p className="text-xs text-[#70656B] mt-1">Ce QR code regroupe tous les lots du conteneur en une seule page publique, conforme aux exigences des acheteurs européens et aux réglementations EUDR 2025.</p>
              </div>
            </Card>
          </div>
        )}

        {/* ════════════════ TAB: ANALYTICS ════════════════════════════ */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader title="Scans QR" subtitle="Statistiques de consultation" />
              <div className="mt-4 text-center">
                <p className="text-4xl font-serif font-bold text-[#352638]">—</p>
                <p className="text-xs text-[#70656B] mt-1">Scans total</p>
                <p className="text-xs text-[#70656B] mt-4">Analytics disponibles après le premier scan</p>
              </div>
            </Card>
            <Card>
              <CardHeader title="Pays consultants" />
              <div className="mt-4 text-center text-[#70656B] text-sm">Données non disponibles</div>
            </Card>
            <Card>
              <CardHeader title="Alertes anti-fraude" />
              <div className="mt-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-[#435432]" />
                <span className="text-sm font-semibold text-[#435432]">Aucune anomalie détectée</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Modal: Ajouter lots ───────────────────────────────────────── */}
      <Modal open={addLotOpen} onClose={() => setAddLotOpen(false)} title="Ajouter des lots" size="md">
        <form onSubmit={addLots} className="space-y-4">
          <div className="p-3 bg-[#E5ECD9] border border-[#435432]/30 rounded-[6px]">
            <p className="text-xs text-[#435432] font-medium">
              ✅ Seuls les lots ayant complété le <strong>conditionnement</strong> peuvent être exportés.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#352638] mb-2">
              Lots conditionnés disponibles
            </label>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {(availableLots ?? []).length === 0 ? (
                <div className="text-center py-8 text-[#70656B]">
                  <p className="text-sm">Aucun lot conditionné disponible</p>
                  <p className="text-xs mt-1 text-[#70656B]">
                    Les lots doivent terminer le conditionnement avant d'être exportables.
                  </p>
                </div>
              ) : (
                (availableLots ?? []).map((lot: any) => {
                  const alreadyAdded = lots.some((l: any) => l.id === lot.id);
                  return (
                    <label key={lot.id} className={`flex items-center gap-3 p-2.5 rounded-[6px] cursor-pointer transition-colors ${alreadyAdded ? 'opacity-40' : 'hover:bg-[#F5F0E7]'}`}>
                      <input
                        type="checkbox"
                        disabled={alreadyAdded}
                        onChange={e => {
                          const ids = addLotIds.split(',').map(s => s.trim()).filter(Boolean);
                          if (e.target.checked) setAddLotIds([...ids, lot.id].join(','));
                          else setAddLotIds(ids.filter(i => i !== lot.id).join(','));
                        }}
                        checked={addLotIds.includes(lot.id)}
                        className="rounded"
                      />
                      <span className="font-mono text-xs font-semibold text-[#AD5138]">{lot.lotNumber}</span>
                      <span className="text-xs text-[#70656B]">{lot.product?.name}</span>
                      <span className="text-xs text-[#435432] font-semibold ml-auto">✅ Conditionné</span>
                      {alreadyAdded && <span className="text-xs text-[#70656B] ml-auto">déjà ajouté</span>}
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddLotOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={(availableLots ?? []).length === 0}>Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Ajouter document ───────────────────────────────────── */}
      <Modal open={addDocOpen} onClose={() => setAddDocOpen(false)} title="Ajouter un document" size="md">
        <form onSubmit={addDoc} className="space-y-4">
          <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Nom *</label><input className="input" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div>
            <label className="block text-xs font-semibold text-[#352638] mb-1.5">Type *</label>
            <select className="input" value={docForm.docType} onChange={e => setDocForm(f => ({ ...f, docType: e.target.value }))}>
              {Object.entries(DOC_TYPE_CONFIG).map(([k, v]: [string, any]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">URL du fichier *</label><input className="input" type="url" placeholder="https://..." value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} required /></div>
          <textarea className="input h-16 resize-none" placeholder="Notes..." value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddDocOpen(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Éditer expédition ──────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier l'expédition" size="lg">
        {editForm && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Référence *</label><input className="input" value={editForm.reference} onChange={e => setEditForm((f: any) => ({ ...f, reference: e.target.value }))} required /></div>
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Transporteur *</label><input className="input" value={editForm.carrierName} onChange={e => setEditForm((f: any) => ({ ...f, carrierName: e.target.value }))} required /></div>
            </div>
            <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">N° Conteneur</label><input className="input font-mono" value={editForm.containerNumber || ''} onChange={e => setEditForm((f: any) => ({ ...f, containerNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Port départ</label><input className="input" value={editForm.departureLocation} onChange={e => setEditForm((f: any) => ({ ...f, departureLocation: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Port arrivée</label><input className="input" value={editForm.arrivalLocation} onChange={e => setEditForm((f: any) => ({ ...f, arrivalLocation: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Date départ</label><input type="date" className="input" value={editForm.departureDate ? editForm.departureDate.slice(0, 10) : ''} onChange={e => setEditForm((f: any) => ({ ...f, departureDate: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-[#352638] mb-1.5">Arrivée prévue</label><input type="date" className="input" value={editForm.expectedArrival ? editForm.expectedArrival.slice(0, 10) : ''} onChange={e => setEditForm((f: any) => ({ ...f, expectedArrival: e.target.value }))} /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Statut</label>
              <select className="input" value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                {Object.entries(SHIPMENT_STATUS_CONFIG).map(([k, v]: [string, any]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <textarea className="input h-16 resize-none" placeholder="Notes..." value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Confirmer suppression ─────────────────────────────── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Supprimer l'expédition" size="sm">
        <p className="text-sm text-[#70656B] mb-4">Êtes-vous sûr de vouloir supprimer <strong className="text-[#352638]">{shipment.reference}</strong> ? Cette action est irréversible.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Annuler</Button>
          <Button variant="danger" onClick={deleteShipment}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
};

/* ── Helper InfoRow ──────────────────────────────────────────────────────── */
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; mono?: boolean; color?: string }> = ({ icon, label, value, mono, color }) => (
  <div className="flex items-start gap-2.5 p-3 bg-[#F5F0E7] rounded-[6px] border border-[#D8CEC4]">
    <div className="text-[#70656B] mt-0.5 flex-shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-[#70656B]">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${color || 'text-[#352638]'} ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  </div>
);
