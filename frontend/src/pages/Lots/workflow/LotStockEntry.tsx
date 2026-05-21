import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: 'tk',          label: 'TK' },
  { key: 'moisi',       label: 'Moisi' },
  { key: 'cuts',        label: 'Cuts' },
  { key: 'poquee',      label: 'Poquée' },
  { key: 'noirGourmet', label: 'Noir Gourmet' },
  { key: 'noirTk',      label: 'Noir TK' },
  { key: 'rougeUs',     label: 'Rouge US' },
  { key: 'rougeEurope', label: 'Rouge Europe' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

type FormState = {
  specification:    string;
  fondusPoids:      string;
  fondusNbSousVide: string;
} & Record<CategoryKey, string>;

const EMPTY_FORM: FormState = {
  specification: '', fondusPoids: '', fondusNbSousVide: '',
  tk: '', moisi: '', cuts: '', poquee: '', noirGourmet: '', noirTk: '', rougeUs: '', rougeEurope: '',
};

export const LotStockEntry: React.FC<{ lotId: string }> = ({ lotId }) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lot-stock-entry', lotId],
    queryFn: () => api.get(`/lots/${lotId}/stock-entry`).then(r => r.data.data),
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedValidation, setSubmittedValidation] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      specification:    data.specification    ?? '',
      fondusPoids:      data.fondusPoids      != null ? String(data.fondusPoids)      : '',
      fondusNbSousVide: data.fondusNbSousVide != null ? String(data.fondusNbSousVide) : '',
      tk:               data.tk              != null ? String(data.tk)              : '',
      moisi:            data.moisi           != null ? String(data.moisi)           : '',
      cuts:             data.cuts            != null ? String(data.cuts)            : '',
      poquee:           data.poquee          != null ? String(data.poquee)          : '',
      noirGourmet:      data.noirGourmet     != null ? String(data.noirGourmet)     : '',
      noirTk:           data.noirTk          != null ? String(data.noirTk)          : '',
      rougeUs:          data.rougeUs         != null ? String(data.rougeUs)         : '',
      rougeEurope:      data.rougeEurope     != null ? String(data.rougeEurope)     : '',
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/lots/${lotId}/stock-entry`, payload),
    onSuccess: (response: any) => {
      if (response?.data?.data?.validatedAt) setSubmittedValidation(true);
      qc.invalidateQueries({ queryKey: ['lot-stock-entry', lotId] });
      toast.success('Entrée stock enregistrée');
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const isLocked = !!data?.validatedAt || submittedValidation;

  const buildPayload = (validate = false) => ({
    specification:    form.specification    || undefined,
    fondusPoids:      form.fondusPoids      ? parseFloat(form.fondusPoids)        : undefined,
    fondusNbSousVide: form.fondusNbSousVide ? parseInt(form.fondusNbSousVide, 10) : undefined,
    ...Object.fromEntries(
      CATEGORIES.map(({ key }) => [key, form[key] ? parseFloat(form[key]) : undefined])
    ),
    ...(validate ? { validatedAt: new Date().toISOString() } : {}),
  });

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader
        title="Entrée Stock"
        subtitle="Détails par taille et catégorie"
        action={isLocked ? (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={14} /> Validée
          </span>
        ) : undefined}
      />

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Spécification</label>
          <textarea
            className="input h-20 resize-none"
            disabled={isLocked}
            value={form.specification}
            onChange={e => setForm(f => ({ ...f, specification: e.target.value }))}
            placeholder="Spécification libre..."
          />
        </div>

        {/* Fondus */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Fondus
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Poids (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                disabled={isLocked}
                value={form.fondusPoids}
                onChange={e => setForm(f => ({ ...f, fondusPoids: e.target.value }))}
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nombre sous-vide</label>
              <input
                type="number"
                className="input"
                disabled={isLocked}
                value={form.fondusNbSousVide}
                onChange={e => setForm(f => ({ ...f, fondusNbSousVide: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Détails par taille (kg)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  disabled={isLocked}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>
        </div>

        {!isLocked && (
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(false))}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              size="sm"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(true))}
            >
              Valider l'entrée stock
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
