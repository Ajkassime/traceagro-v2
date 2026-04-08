import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Package, Users } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

export const SettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [productModal, setProductModal] = useState(false);
  const [form, setForm] = useState({ name: '', variety: '', category: '', unit: 'kg', description: '' });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', form);
      toast.success('Produit créé');
      setProductModal(false);
      qc.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Produit supprimé');
      qc.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Paramètres" subtitle="Configuration de la plateforme" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">

        {/* Profil */}
        <Card>
          <CardHeader title="Mon profil" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-forest-600 flex items-center justify-center text-white font-bold text-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="badge bg-forest-500/10 text-forest-400 mt-1">{user?.role}</span>
            </div>
          </div>
        </Card>

        {/* Référentiel produits */}
        <Card>
          <CardHeader
            title="Référentiel Produits"
            subtitle={`${(products ?? []).length} produits enregistrés`}
            action={user?.role === 'admin' && <Button size="sm" onClick={() => setProductModal(true)} icon={<Plus size={14} />}>Ajouter</Button>}
          />
          {isLoading ? <PageLoader /> : (
            <div className="space-y-2">
              {(products ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-gray-600">{p.category} · {p.unit} · {p._count?.lots ?? 0} lots</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Button variant="danger" size="sm" onClick={() => deleteProduct(p.id)}>Supprimer</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      <Modal open={productModal} onClose={() => setProductModal(false)} title="Nouveau produit">
        <form onSubmit={createProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Nom *</label><input className="input" value={form.name} onChange={(e) => setF('name', e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Code catégorie *</label><input className="input font-mono uppercase" placeholder="VAN, CAF, CAC..." value={form.category} onChange={(e) => setF('category', e.target.value.toUpperCase())} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Variété</label><input className="input" value={form.variety} onChange={(e) => setF('variety', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Unité</label><input className="input" value={form.unit} onChange={(e) => setF('unit', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setProductModal(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
