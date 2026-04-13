import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Globe, Trash2, Search, Building2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Spinner'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function Clients() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', country: '' })
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then(r => r.data.data),
  })

  const clients = (data ?? []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.country.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/clients', form)
      toast.success('Client créé')
      setCreateOpen(false)
      setForm({ name: '', country: '' })
      qc.invalidateQueries({ queryKey: ['clients'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le client "${name}" ?`)) return
    setDeleting(id)
    try {
      await api.delete(`/clients/${id}`)
      toast.success('Client supprimé')
      qc.invalidateQueries({ queryKey: ['clients'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setDeleting(null) }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Clients"
        subtitle={`${(data ?? []).length} client(s) enregistré(s)`}
        action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Nouveau client</Button>}
      />

      <div className="flex-1 p-6 space-y-5 animate-fade-in">

        {/* Recherche */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-9 text-sm"
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Liste */}
        {isLoading ? (
          <PageLoader />
        ) : clients.length === 0 ? (
          <EmptyState
            title="Aucun client"
            description="Ajoutez vos clients pour les associer aux bons de commande."
            icon={<Building2 size={40} />}
            action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Nouveau client</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clients.map((client: any) => (
              <Card key={client.id} className="p-4 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(30,92,110,0.15)', border: '1px solid rgba(30,92,110,0.3)' }}>
                    <Building2 size={18} style={{ color: '#2a7a90' }} />
                  </div>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    disabled={deleting === client.id}
                    className="text-red-500/40 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className="font-semibold text-white text-sm mb-1 truncate">{client.name}</p>

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <Globe size={11} />
                  <span>{client.country}</span>
                </div>

                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-300">{client._count?.purchaseOrders ?? 0}</span> bon(s) de commande
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal création */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau client" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom du client *</label>
            <input
              className="input"
              placeholder="Marks & Spencer, Naturalia..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Pays *</label>
            <input
              className="input"
              placeholder="France, Royaume-Uni, USA..."
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
