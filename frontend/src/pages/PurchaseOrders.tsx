import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Search, Calendar, Package, ChevronRight, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Spinner'
import api from '../lib/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:       { label: 'En attente',    color: '#fb923c', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  in_production: { label: 'En production', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: Package },
  ready:         { label: 'Prêt',          color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle },
  shipped:       { label: 'Expédié',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Truck },
  delivered:     { label: 'Livré',         color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: CheckCircle },
  cancelled:     { label: 'Annulé',        color: '#f87171', bg: 'rgba(239,68,68,0.12)',  icon: AlertCircle },
}

const GRADES = ['1er choix', '2ème choix', '3ème choix', '4ème choix']
const PACKAGINGS = ['carton', 'sac', 'vrac']
const CERTIFICATIONS = ['Bio', 'Fair Trade', 'EUDR', 'Rainforest Alliance']

const EMPTY_FORM = {
  poNumber: '', clientId: '', lotId: '', quantityKg: '',
  destination: '', deliveryDate: '',
  specGrade: '', specHumidityMin: '', specHumidityMax: '',
  specLengthMin: '', specCertifications: [] as string[],
  specPackaging: '', specNotes: '',
}

export default function PurchaseOrders() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => api.get('/purchase-orders', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data.data),
  })

  const { data: lotsData } = useQuery({
    queryKey: ['lots-with-available'],
    queryFn: () => api.get('/lots', { params: { limit: 200 } }).then(r => r.data.data),
  })

  const orders = (data ?? []).filter((o: any) =>
    o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.client?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.lot?.lotNumber.toLowerCase().includes(search.toLowerCase())
  )

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleCert = (cert: string) => {
    setForm(f => ({
      ...f,
      specCertifications: f.specCertifications.includes(cert)
        ? f.specCertifications.filter(c => c !== cert)
        : [...f.specCertifications, cert],
    }))
  }

  const selectedLot = (lotsData ?? []).find((l: any) => l.id === form.lotId)
  const availableKg = selectedLot ? (selectedLot.availableKg ?? selectedLot.quantityKg) : 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.quantityKg && parseFloat(form.quantityKg) > availableKg) {
      toast.error(`Quantité insuffisante. Disponible : ${availableKg} kg`)
      return
    }
    setSaving(true)
    try {
      await api.post('/purchase-orders', {
        ...form,
        quantityKg: parseFloat(form.quantityKg),
        specHumidityMin: form.specHumidityMin ? parseFloat(form.specHumidityMin) : undefined,
        specHumidityMax: form.specHumidityMax ? parseFloat(form.specHumidityMax) : undefined,
        specLengthMin:   form.specLengthMin   ? parseFloat(form.specLengthMin)   : undefined,
        poNumber: form.poNumber || undefined,
      })
      toast.success('Bon de commande créé')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['lots-with-available'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/purchase-orders/${id}`, { status })
      toast.success('Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    } catch (err: any) { toast.error('Erreur') }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Bons de commande"
        subtitle={`${(data ?? []).length} PO · Traçabilité client`}
        action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Nouveau PO</Button>}
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#70656B]" />
            <input className="input pl-9 text-sm" placeholder="Rechercher PO, client, lot..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 bg-[#FFFCF6] rounded-[6px] border border-[#D8CEC4]">
            {[['', 'Tous'], ['pending', 'En attente'], ['in_production', 'Production'], ['ready', 'Prêt'], ['shipped', 'Expédié'], ['delivered', 'Livré']].map(([k, l]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`px-3 py-1.5 text-xs rounded-[4px] font-medium transition-all ${statusFilter === k ? 'bg-[#352638] text-[#FFFCF6]' : 'text-[#70656B] hover:text-[#352638] hover:bg-[#F5F0E7]'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {isLoading ? <PageLoader /> : orders.length === 0 ? (
          <EmptyState title="Aucun bon de commande" icon={<FileText size={40} />}
            action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Créer</Button>} />
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              const isLate = new Date(order.deliveryDate) < new Date() && !['delivered', 'cancelled'].includes(order.status)

              return (
                <Card key={order.id} className="p-4 hover:border-[#AD5138] transition-all">
                  <div className="flex items-start justify-between gap-4">

                    {/* Infos principales */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-[6px] flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                        <StatusIcon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-sm font-bold text-[#352638]">{order.poNumber}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {isLate && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F8E6E8] text-[#963C47] font-semibold border border-[#963C47]/20">⚠️ En retard</span>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-[#70656B]">
                          <span className="font-semibold text-[#352638]">{order.client?.name}</span>
                          <span className="text-[#D8CEC4]">·</span>
                          <span className="font-mono font-medium text-[#AD5138]">{order.lot?.lotNumber}</span>
                          <span className="text-[#D8CEC4]">·</span>
                          <span className="font-medium text-[#352638] tabular-nums">{order.quantityKg} kg</span>
                          <span className="text-[#D8CEC4]">·</span>
                          <span>📍 {order.destination}</span>
                          <span className="text-[#D8CEC4]">·</span>
                          <span className={isLate ? 'text-[#963C47] font-medium' : ''}>
                            <Calendar size={10} className="inline mr-1" />
                            {new Date(order.deliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Specs techniques */}
                        {(order.specGrade || order.specPackaging || order.specCertifications?.length > 0) && (
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {order.specGrade && <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[#EAE2EB] text-[#352638] font-medium">{order.specGrade}</span>}
                            {order.specHumidityMin && order.specHumidityMax && (
                              <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[#EAE2EB] text-[#352638] font-medium">
                                💧 {order.specHumidityMin}–{order.specHumidityMax}%
                              </span>
                            )}
                            {order.specPackaging && <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[#EAE2EB] text-[#352638] font-medium">📦 {order.specPackaging}</span>}
                            {(order.specCertifications ?? []).map((c: string) => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded-[4px] bg-[#E5ECD9] text-[#435432] font-medium">✓ {c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions statut */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'in_production')}
                          className="text-xs px-3 py-1.5 rounded-[6px] bg-[#EAE2EB] text-[#352638] hover:bg-[#D8CEC4] transition-all font-semibold">
                          → Production
                        </button>
                      )}
                      {order.status === 'in_production' && (
                        <button onClick={() => updateStatus(order.id, 'ready')}
                          className="text-xs px-3 py-1.5 rounded-[6px] bg-[#E5ECD9] text-[#435432] hover:bg-[#D8DF72] transition-all font-semibold">
                          → Prêt
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal création */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau bon de commande" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* Numéro PO */}
          <div>
            <label className="block text-xs font-semibold text-[#352638] mb-1.5">
              N° PO <span className="text-[#70656B] font-normal">(laisser vide pour génération auto)</span>
            </label>
            <input className="input font-mono" placeholder="PO-2026-001 (depuis votre ERP)" value={form.poNumber} onChange={e => setF('poNumber', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Client *</label>
              <select className="input" required value={form.clientId} onChange={e => setF('clientId', e.target.value)}>
                <option value="">-- Choisir un client --</option>
                {(clients ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.country}</option>)}
              </select>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Destination *</label>
              <input className="input" placeholder="France, Royaume-Uni..." required value={form.destination} onChange={e => setF('destination', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Lot */}
            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Lot source *</label>
              <select className="input" required value={form.lotId} onChange={e => setF('lotId', e.target.value)}>
                <option value="">-- Choisir un lot --</option>
                {(lotsData ?? []).map((l: any) => {
                  const avail = l.availableKg ?? l.quantityKg
                  return <option key={l.id} value={l.id} disabled={avail <= 0}>{l.lotNumber} — {avail.toFixed(1)} kg dispo</option>
                })}
              </select>
              {selectedLot && (
                <p className="text-xs mt-1" style={{ color: availableKg < 100 ? '#963C47' : '#435432' }}>
                  Disponible : <strong>{availableKg.toFixed(1)} kg</strong>
                </p>
              )}
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Quantité demandée (kg) *</label>
              <input
                className="input" type="number" min="1" max={availableKg} step="0.1"
                placeholder="250" required value={form.quantityKg}
                onChange={e => setF('quantityKg', e.target.value)}
                style={{ borderColor: form.quantityKg && parseFloat(form.quantityKg) > availableKg ? '#963C47' : '' }}
              />
              {form.quantityKg && parseFloat(form.quantityKg) > availableKg && (
                <p className="text-xs text-[#963C47] mt-1">⚠️ Dépasse la quantité disponible</p>
              )}
            </div>
          </div>

          {/* Date livraison */}
          <div>
            <label className="block text-xs font-semibold text-[#352638] mb-1.5">Date de livraison souhaitée *</label>
            <input type="date" className="input" required value={form.deliveryDate} onChange={e => setF('deliveryDate', e.target.value)} />
          </div>

          {/* ── Spécifications techniques ── */}
          <div className="border border-[#D8CEC4] bg-[#F5F0E7] rounded-[8px] p-4 space-y-4">
            <p className="text-xs font-semibold text-[#352638] uppercase tracking-wider">📋 Spécifications techniques</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#352638] mb-1.5">Grade</label>
                <select className="input bg-[#FFFCF6]" value={form.specGrade} onChange={e => setF('specGrade', e.target.value)}>
                  <option value="">-- Non spécifié --</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#352638] mb-1.5">Conditionnement</label>
                <select className="input bg-[#FFFCF6]" value={form.specPackaging} onChange={e => setF('specPackaging', e.target.value)}>
                  <option value="">-- Non spécifié --</option>
                  {PACKAGINGS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#352638] mb-1.5">Humidité min (%)</label>
                <input className="input bg-[#FFFCF6]" type="number" step="0.1" placeholder="28" value={form.specHumidityMin} onChange={e => setF('specHumidityMin', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#352638] mb-1.5">Humidité max (%)</label>
                <input className="input bg-[#FFFCF6]" type="number" step="0.1" placeholder="32" value={form.specHumidityMax} onChange={e => setF('specHumidityMax', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#352638] mb-1.5">Longueur min (cm)</label>
                <input className="input bg-[#FFFCF6]" type="number" step="0.5" placeholder="14" value={form.specLengthMin} onChange={e => setF('specLengthMin', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-2">Certifications requises</label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map(cert => (
                  <button key={cert} type="button" onClick={() => toggleCert(cert)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all border ${
                      form.specCertifications.includes(cert)
                        ? 'bg-[#E5ECD9] text-[#435432] border-[#435432]'
                        : 'bg-[#FFFCF6] text-[#70656B] border-[#D8CEC4] hover:border-[#AD5138]'
                    }`}>
                    {form.specCertifications.includes(cert) ? '✓ ' : ''}{cert}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352638] mb-1.5">Notes libres</label>
              <textarea className="input bg-[#FFFCF6] h-16 resize-none" placeholder="Instructions spéciales, remarques client..." value={form.specNotes} onChange={e => setF('specNotes', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || (!!form.quantityKg && parseFloat(form.quantityKg) > availableKg)}>
              {saving ? 'Création...' : 'Créer le bon de commande'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
