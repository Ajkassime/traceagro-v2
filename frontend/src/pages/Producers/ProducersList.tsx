import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, MapPin, Award } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageLoader, EmptyState } from '../../components/ui/Spinner';
import { CERT_TYPE_CONFIG, formatDate } from '../../lib/utils';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ProducersList: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', village: '', latitude: '', longitude: '', areaHectares: '', email: '', telephone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['producers', search],
    queryFn: () => api.get('/producers', { params: { limit: 50, search: search || undefined } }).then((r) => r.data),
  });
  const producers = data?.data ?? [];

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/producers', {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        areaHectares: form.areaHectares ? parseFloat(form.areaHectares) : undefined,
      });
      toast.success('Producteur créé');
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['producers'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Producteurs" subtitle={`${data?.pagination?.total ?? 0} producteurs`} />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex gap-3 items-center justify-between">
          <SearchInput placeholder="Rechercher un producteur..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>Nouveau producteur</Button>
        </div>

        {isLoading ? <PageLoader /> : producers.length === 0 ? (
          <EmptyState title="Aucun producteur" icon={<Users size={40} />} action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Ajouter</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {producers.map((p: any) => (
              <Card key={p.id} hover onClick={() => navigate(`/producers/${p.id}`)} className="cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-forest-600/20 flex items-center justify-center text-forest-400 flex-shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{p.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin size={11} />
                      <span>{p.region}, {p.country}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{p._count?.lots ?? 0} lots</span>
                  {p.areaHectares && <span className="text-gray-500">{p.areaHectares} ha</span>}
                  <div className="flex gap-1">
                    {(p.certifications ?? []).map((c: any) => (
                      <span key={c.id} title={CERT_TYPE_CONFIG[c.type]?.label}>{CERT_TYPE_CONFIG[c.type]?.emoji ?? '📋'}</span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau producteur" size="lg">
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom *</label>
              <input className="input" value={form.name} onChange={(e) => setF('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Région *</label>
              <input className="input" placeholder="SAVA, Analanjirofo..." value={form.region} onChange={(e) => setF('region', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Village</label>
              <input className="input" value={form.village} onChange={(e) => setF('village', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Surface (ha)</label>
              <input type="number" step="0.1" className="input" value={form.areaHectares} onChange={(e) => setF('areaHectares', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Latitude GPS</label>
              <input type="number" step="any" className="input" placeholder="-14.267" value={form.latitude} onChange={(e) => setF('latitude', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Longitude GPS</label>
              <input type="number" step="any" className="input" placeholder="50.167" value={form.longitude} onChange={(e) => setF('longitude', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setF('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Téléphone</label>
              <input className="input" value={form.telephone} onChange={(e) => setF('telephone', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
