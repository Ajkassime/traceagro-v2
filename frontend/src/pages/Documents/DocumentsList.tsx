import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, AlertTriangle, Search, Filter, Download,
  ExternalLink, Trash2, BarChart3, Clock, CheckCircle, Package, Ship
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, EmptyState } from '../../components/ui/Spinner';
import { DOC_TYPE_CONFIG, formatDate } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';

/* ── Couleur expiration ─────────────────────────────────────────────────── */
const expiryClass = (days: number) =>
  days <= 7  ? 'bg-red-500/20 text-red-400 border-red-500/30' :
  days <= 30 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
  'bg-vanilla-500/20 text-vanilla-400 border-vanilla-500/30';

/* ── Stat Card mini ─────────────────────────────────────────────────────── */
const StatMini: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color?: string }> = ({ icon, label, value, color }) => (
  <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center ${color || 'text-gray-400'}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
export const DocumentsList: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'lot' | 'producer' | 'shipment'>('all');
  const [viewTab, setViewTab] = useState<'list' | 'stats'>('list');
  const [form, setForm] = useState({
    name: '', docType: 'phytosanitary', fileUrl: '',
    lotId: '', producerId: '', shipmentId: '', notes: ''
  });

  /* ── Queries ─────────────────────────────────────────────────────────── */
  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents', filterType, search],
    queryFn: () => api.get('/documents', { params: { docType: filterType || undefined, search: search || undefined } }).then(r => r.data.data),
  });

  const { data: expiringCerts } = useQuery({
    queryKey: ['expiring-certs'],
    queryFn: () => api.get('/documents/expiring-certifications', { params: { days: 60 } }).then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['documents-stats'],
    queryFn: () => api.get('/documents/stats').then(r => r.data.data),
  });

  const { data: lotsData } = useQuery({ queryKey: ['lots-for-docs'], queryFn: () => api.get('/lots', { params: { limit: 100 } }).then(r => r.data.data) });
  const { data: producersData } = useQuery({ queryKey: ['producers-for-docs'], queryFn: () => api.get('/producers', { params: { limit: 100 } }).then(r => r.data.data) });
  const { data: shipmentsData } = useQuery({ queryKey: ['shipments-for-docs'], queryFn: () => api.get('/shipments', { params: { limit: 100 } }).then(r => r.data.data) });

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents', {
        ...form,
        lotId: form.lotId || undefined,
        producerId: form.producerId || undefined,
        shipmentId: form.shipmentId || undefined,
      });
      toast.success('Document ajouté');
      setCreateOpen(false);
      setForm({ name: '', docType: 'phytosanitary', fileUrl: '', lotId: '', producerId: '', shipmentId: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['documents-stats'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const deleteDoc = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/documents/${deleteId}`);
      toast.success('Document supprimé');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['documents-stats'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  /* ── Filtres actifs ───────────────────────────────────────────────────── */
  const filteredDocs = (docs ?? []).filter((doc: any) => {
    if (filterEntity === 'lot')      return !!doc.lotId && !doc.producerId && !doc.shipmentId;
    if (filterEntity === 'producer') return !!doc.producerId;
    if (filterEntity === 'shipment') return !!doc.shipmentId;
    return true;
  });

  const docTypeOptions = Object.entries(DOC_TYPE_CONFIG).map(([v, c]: [string, any]) => ({ value: v, label: `${c.emoji} ${c.label}` }));
  const totalDocs = stats?.total ?? (docs ?? []).length;

  /* ═══════════════════════════════════════════════ RENDER ═══════════════ */
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Documents"
        subtitle={`${totalDocs} document(s) · Gestion documentaire & certifications`}
        action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Ajouter un document</Button>}
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">

        {/* ── Alerte certifications expirant ───────────────────────── */}
        {(expiringCerts ?? []).length > 0 && (
          <Card className="border-vanilla-500/30 bg-vanilla-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-vanilla-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-vanilla-400">
                  ⚠️ {expiringCerts.length} certification(s) expirent dans les 60 prochains jours
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {expiringCerts.map((c: any) => {
                    const days = differenceInDays(parseISO(c.expiresAt), new Date());
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/producers/${c.producer.id}`)}
                        className={`text-xs px-2.5 py-1 rounded-full border ${expiryClass(days)} transition-opacity hover:opacity-80`}
                      >
                        {c.producer.name} — {c.type} ({days}j)
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── KPI stats ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatMini icon={<FileText size={16} />}   label="Total documents"    value={totalDocs}                         color="text-blue-400" />
          <StatMini icon={<CheckCircle size={16} />} label="Certifications bio" value={(stats?.byType ?? []).find((t: any) => t.type === 'organic_cert')?.count ?? 0}  color="text-forest-400" />
          <StatMini icon={<AlertTriangle size={16} />} label="Expirent bientôt" value={(expiringCerts ?? []).length}     color="text-vanilla-400" />
          <StatMini icon={<Clock size={16} />}       label="Ajoutés ce mois"   value="—"                                 color="text-gray-400" />
        </div>

        {/* ── Stats par type ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
          {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]: [string, any]) => {
            const count = (stats?.byType ?? []).find((t: any) => t.type === key)?.count ?? (docs ?? []).filter((d: any) => d.docType === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterType(f => f === key ? '' : key)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  filterType === key ? 'border-forest-500/50 bg-forest-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <span className="text-xl">{cfg.emoji}</span>
                <p className={`text-lg font-bold mt-1 ${count > 0 ? 'text-white' : 'text-gray-600'}`}>{count}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* ── Filtres & recherche ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-9 text-sm"
              placeholder="Rechercher un document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
            {([['all', 'Tous'], ['lot', '📦 Lots'], ['producer', '👤 Producteurs'], ['shipment', '🚢 Expéditions']] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilterEntity(k)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${filterEntity === k ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {l}
              </button>
            ))}
          </div>
          {(filterType || search || filterEntity !== 'all') && (
            <Button size="sm" variant="ghost" onClick={() => { setFilterType(''); setSearch(''); setFilterEntity('all'); }}>
              Effacer filtres
            </Button>
          )}
        </div>

        {/* ── Liste documents ──────────────────────────────────────── */}
        {isLoading ? (
          <PageLoader />
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            title="Aucun document"
            icon={<FileText size={40} />}
            action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Ajouter</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map((doc: any) => {
              const cfg = DOC_TYPE_CONFIG[doc.docType] as any;
              return (
                <div key={doc.id} className="flex items-start gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-white/10 transition-all group">

                  {/* Icône */}
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">{cfg?.emoji}</div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{cfg?.label}</p>

                    {/* Associations */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {doc.lot && (
                        <button onClick={() => navigate(`/lots/${doc.lot.id}`)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-forest-500/10 text-forest-400 hover:bg-forest-500/20 transition-colors">
                          <Package size={10} /> {doc.lot.lotNumber}
                        </button>
                      )}
                      {doc.producer && (
                        <button onClick={() => navigate(`/producers/${doc.producer.id}`)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                          👤 {doc.producer.name}
                        </button>
                      )}
                      {doc.shipment && (
                        <button onClick={() => navigate(`/shipments/${doc.shipment.id}`)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                          <Ship size={10} /> {doc.shipment.reference}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 mt-1">{formatDate(doc.createdAt)}</p>
                    {doc.notes && <p className="text-xs text-gray-600 mt-0.5 truncate italic">{doc.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <button className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <ExternalLink size={13} />
                      </button>
                    </a>
                    <button onClick={() => setDeleteId(doc.id)} className="p-1.5 rounded-lg bg-white/5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Ajouter document ───────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter un document" size="lg">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom du document *</label>
            <input className="input" placeholder="Certificat phytosanitaire N°2026-..." value={form.name} onChange={e => setF('name', e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Type de document *</label>
            <select className="input" value={form.docType} onChange={e => setF('docType', e.target.value)}>
              {docTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">URL du fichier *</label>
            <input className="input" type="url" placeholder="https://drive.google.com/..." value={form.fileUrl} onChange={e => setF('fileUrl', e.target.value)} required />
            <p className="text-xs text-gray-600 mt-1">Lien vers Google Drive, Dropbox, ou URL directe du fichier</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Lot associé</label>
              <select className="input text-sm" value={form.lotId} onChange={e => setF('lotId', e.target.value)}>
                <option value="">— Aucun lot —</option>
                {(lotsData ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Producteur associé</label>
              <select className="input text-sm" value={form.producerId} onChange={e => setF('producerId', e.target.value)}>
                <option value="">— Aucun producteur —</option>
                {(producersData ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Expédition associée</label>
              <select className="input text-sm" value={form.shipmentId} onChange={e => setF('shipmentId', e.target.value)}>
                <option value="">— Aucune expédition —</option>
                {(shipmentsData ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.reference}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
            <textarea className="input h-16 resize-none" placeholder="Notes additionnelles..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Confirmer suppression ─────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Supprimer le document" size="sm">
        <p className="text-sm text-gray-400 mb-4">Cette action est irréversible. Le fichier ne sera pas supprimé du serveur de stockage.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button variant="danger" onClick={deleteDoc}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
};
