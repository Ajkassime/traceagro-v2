import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Ship, Search, Filter, Package, MapPin, Calendar,
  Truck, CheckCircle, Clock, AlertCircle, BarChart3, ChevronRight
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, EmptyState } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { SHIPMENT_STATUS_CONFIG, formatDate } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

/* ── Icône par statut ──────────────────────────────────────────────────── */
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'delivered')  return <CheckCircle size={14} className="text-forest-400" />;
  if (status === 'in_transit') return <Truck size={14} className="text-blue-400" />;
  if (status === 'cancelled')  return <AlertCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-vanilla-400" />;
};

/* ── Carte expédition ──────────────────────────────────────────────────── */
const ShipmentCard: React.FC<{ s: any; onClick: () => void }> = ({ s, onClick }) => {
  const cfg = SHIPMENT_STATUS_CONFIG[s.status] ?? SHIPMENT_STATUS_CONFIG.preparing;
  const lots = s.shipmentLots ?? [];
  const totalQty = lots.reduce((acc: number, sl: any) => acc + (sl.lot?.actualQuantity || sl.lot?.expectedQuantity || 0), 0);

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-forest-500/30 hover:bg-white/[0.05] transition-all cursor-pointer group"
    >
      {/* Header carte */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Ship size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-white group-hover:text-forest-400 transition-colors">{s.reference}</p>
            <p className="text-xs text-gray-500">{s.carrierName}</p>
          </div>
        </div>
        <StatusBadge config={cfg} />
      </div>

      {/* Itinéraire */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          <MapPin size={11} className="text-gray-600 flex-shrink-0" />
          <span className="text-xs text-gray-400 truncate">{s.departureLocation}</span>
        </div>
        <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
        <div className="flex items-center gap-1">
          <MapPin size={11} className="text-gray-600 flex-shrink-0" />
          <span className="text-xs text-gray-400 truncate">{s.arrivalLocation}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${
          s.status === 'preparing' ? 'w-1/3 bg-vanilla-500' :
          s.status === 'in_transit' ? 'w-2/3 bg-blue-500' :
          s.status === 'delivered' ? 'w-full bg-forest-500' : 'w-0'
        }`} />
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1"><Package size={11} /> {s._count?.shipmentLots ?? lots.length} lot(s)</span>
        {s.containerNumber && <span className="font-mono">{s.containerNumber}</span>}
        {s.expectedArrival && <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(s.expectedArrival)}</span>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
export const ShipmentsList: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [form, setForm] = useState({
    reference: '', carrierName: '', containerNumber: '',
    departureLocation: '', arrivalLocation: '',
    departureDate: '', expectedArrival: '', notes: '',
  });

  /* ── Queries ─────────────────────────────────────────────────────────── */
  const { data, isLoading } = useQuery({
    queryKey: ['shipments', filterStatus, search],
    queryFn: () => api.get('/shipments', { params: { limit: 50, status: filterStatus || undefined, search: search || undefined } }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['shipments-stats'],
    queryFn: () => api.get('/shipments/stats').then(r => r.data.data),
  });

  const shipments = data?.data ?? [];
  const total = data?.pagination?.total ?? shipments.length;

  /* ── Stats ──────────────────────────────────────────────────────────── */
  const countByStatus = (status: string) =>
    statsData?.byStatus?.find((s: any) => s.status === status)?._count?.id ?? shipments.filter((s: any) => s.status === status).length;

  /* ── Create ──────────────────────────────────────────────────────────── */
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post('/shipments', {
        ...form,
        containerNumber: form.containerNumber || undefined,
        departureDate: form.departureDate ? new Date(form.departureDate).toISOString() : undefined,
        expectedArrival: form.expectedArrival ? new Date(form.expectedArrival).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      toast.success('Expédition créée avec QR code !');
      setCreateOpen(false);
      setForm({ reference: '', carrierName: '', containerNumber: '', departureLocation: '', arrivalLocation: '', departureDate: '', expectedArrival: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipments-stats'] });
      // Naviguer vers le détail
      if (created.data?.data?.id) navigate(`/shipments/${created.data.data.id}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  /* ═══════════════════════════════════════════════ RENDER ═══════════════ */
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Expéditions"
        subtitle={`${total} expédition(s) · Traçabilité conteneurs`}
        action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Nouvelle expédition</Button>}
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">

        {/* ── KPI stats ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1"><Ship size={14} className="text-blue-400" /><span className="text-xs text-gray-500">Total</span></div>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="p-4 bg-vanilla-500/5 rounded-xl border border-vanilla-500/20">
            <div className="flex items-center gap-2 mb-1"><Clock size={14} className="text-vanilla-400" /><span className="text-xs text-gray-500">En préparation</span></div>
            <p className="text-2xl font-bold text-vanilla-400">{countByStatus('preparing')}</p>
          </div>
          <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1"><Truck size={14} className="text-blue-400" /><span className="text-xs text-gray-500">En transit</span></div>
            <p className="text-2xl font-bold text-blue-400">{countByStatus('in_transit')}</p>
          </div>
          <div className="p-4 bg-forest-500/5 rounded-xl border border-forest-500/20">
            <div className="flex items-center gap-2 mb-1"><CheckCircle size={14} className="text-forest-400" /><span className="text-xs text-gray-500">Livrées</span></div>
            <p className="text-2xl font-bold text-forest-400">{countByStatus('delivered')}</p>
          </div>
        </div>

        {/* ── Filtres ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-9 text-sm"
              placeholder="Rechercher une expédition..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
            {([
              ['', 'Tous'],
              ['preparing', '⏳ Préparation'],
              ['in_transit', '🚢 Transit'],
              ['delivered', '✅ Livré'],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${filterStatus === k ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {l}
              </button>
            ))}
          </div>
          {/* Mode vue */}
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
            <button onClick={() => setViewMode('cards')} className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>Cards</button>
            <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>Table</button>
          </div>
        </div>

        {/* ── Contenu ──────────────────────────────────────────────── */}
        {isLoading ? (
          <PageLoader />
        ) : shipments.length === 0 ? (
          <EmptyState
            title="Aucune expédition"
            icon={<Ship size={40} />}
            action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Créer</Button>}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shipments.map((s: any) => (
              <ShipmentCard key={s.id} s={s} onClick={() => navigate(`/shipments/${s.id}`)} />
            ))}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Référence', 'Transporteur', 'Conteneur', 'Départ → Arrivée', 'Lots', 'Arrivée prévue', 'Statut', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s: any) => {
                  const cfg = SHIPMENT_STATUS_CONFIG[s.status];
                  return (
                    <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <button onClick={() => navigate(`/shipments/${s.id}`)} className="font-mono text-xs text-blue-400 hover:text-blue-300">{s.reference}</button>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs">{s.carrierName}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">{s.containerNumber || '—'}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{s.departureLocation} → {s.arrivalLocation}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{s._count?.shipmentLots ?? 0}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{s.expectedArrival ? formatDate(s.expectedArrival) : '—'}</td>
                      <td className="py-3 px-4">{cfg && <StatusBadge config={cfg} />}</td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/shipments/${s.id}`)}>Détail →</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* ── Modal: Créer expédition ───────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle expédition" size="lg">
        <form onSubmit={create} className="space-y-4">
          <div className="p-3 bg-forest-500/5 border border-forest-500/20 rounded-lg">
            <p className="text-xs text-forest-400">
              🔗 Un QR code unique sera automatiquement généré pour cette expédition
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Référence *</label>
              <input className="input" placeholder="EXP-2026-001" value={form.reference} onChange={e => setF('reference', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Transporteur *</label>
              <input className="input" placeholder="CMA CGM, Maersk..." value={form.carrierName} onChange={e => setF('carrierName', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">N° Conteneur</label>
            <input className="input font-mono" placeholder="MSCU1234567" value={form.containerNumber} onChange={e => setF('containerNumber', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Port de départ *</label>
              <input className="input" placeholder="Toamasina" value={form.departureLocation} onChange={e => setF('departureLocation', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Port d'arrivée *</label>
              <input className="input" placeholder="Marseille, Le Havre..." value={form.arrivalLocation} onChange={e => setF('arrivalLocation', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Date de départ</label>
              <input type="date" className="input" value={form.departureDate} onChange={e => setF('departureDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Arrivée prévue</label>
              <input type="date" className="input" value={form.expectedArrival} onChange={e => setF('expectedArrival', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
            <textarea className="input h-16 resize-none" placeholder="Instructions spéciales, remarques..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Créer & générer QR</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
