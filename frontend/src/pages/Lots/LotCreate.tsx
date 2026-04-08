import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface LotCreateProps { onSuccess: () => void; }

const CONDITIONING_TYPES = [
  { key: 'vanille_noire', label: 'Vanille Noire', icon: '🖤', norm: 'Humidité : 36–38%' },
  { key: 'vanille_rouge', label: 'Vanille Rouge', icon: '❤️', norm: 'Humidité selon destination' },
] as const;

export const LotCreate: React.FC<LotCreateProps> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    producerId: '', productId: '', harvestDate: '', quantityKg: '',
    notes: '', harvestLatitude: '', harvestLongitude: '',
    conditioningType: '' as 'vanille_noire' | 'vanille_rouge' | '',
  });
  const [loading, setLoading] = useState(false);

  const { data: producers } = useQuery({
    queryKey: ['producers-select'],
    queryFn: () => api.get('/producers', { params: { limit: 100 } }).then((r) => r.data.data),
  });
  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/lots', {
        producerId: form.producerId,
        productId: form.productId,
        harvestDate: new Date(form.harvestDate).toISOString(),
        quantityKg: parseFloat(form.quantityKg),
        notes: form.notes || undefined,
        harvestLatitude: form.harvestLatitude ? parseFloat(form.harvestLatitude) : undefined,
        harvestLongitude: form.harvestLongitude ? parseFloat(form.harvestLongitude) : undefined,
        conditioningType: form.conditioningType || undefined,
      });
      toast.success('Lot créé avec succès !');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const producerOptions = [
    { value: '', label: 'Sélectionner un producteur' },
    ...(producers ?? []).map((p: any) => ({ value: p.id, label: `${p.name} — ${p.region}` })),
  ];
  const productOptions = [
    { value: '', label: 'Sélectionner un produit' },
    ...(products ?? []).map((p: any) => ({ value: p.id, label: `${p.name} (${p.category})` })),
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Producteur *" options={producerOptions} value={form.producerId} onChange={(e) => set('producerId', e.target.value)} required />
        <Select label="Produit *" options={productOptions} value={form.productId} onChange={(e) => set('productId', e.target.value)} required />
      </div>

      {/* Type de conditionnement */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Type de conditionnement
          <span className="ml-2 text-gray-600 font-normal">(détermine les normes et étapes de production)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {CONDITIONING_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => set('conditioningType', form.conditioningType === t.key ? '' : t.key)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                form.conditioningType === t.key
                  ? 'border-forest-500 bg-forest-500/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${form.conditioningType === t.key ? 'text-forest-400' : 'text-gray-300'}`}>
                  {t.label}
                </p>
                <p className="text-xs text-gray-500">{t.norm}</p>
              </div>
              {form.conditioningType === t.key && (
                <span className="ml-auto text-forest-400 text-base">✓</span>
              )}
            </button>
          ))}
        </div>
        {!form.conditioningType && (
          <p className="text-xs text-gray-600 mt-1.5">Optionnel — peut être défini ultérieurement</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Date de récolte *</label>
          <input type="date" className="input" value={form.harvestDate} onChange={(e) => set('harvestDate', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Quantité (kg) *</label>
          <input type="number" step="0.1" className="input" placeholder="ex: 250.5" value={form.quantityKg} onChange={(e) => set('quantityKg', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Latitude GPS</label>
          <input type="number" step="any" className="input" placeholder="-14.267" value={form.harvestLatitude} onChange={(e) => set('harvestLatitude', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Longitude GPS</label>
          <input type="number" step="any" className="input" placeholder="50.167" value={form.harvestLongitude} onChange={(e) => set('harvestLongitude', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
        <textarea className="input h-20 resize-none" placeholder="Notes optionnelles..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Créer le lot</Button>
      </div>
    </form>
  );
};
