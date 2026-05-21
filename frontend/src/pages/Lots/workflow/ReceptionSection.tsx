import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface ReceptionData {
  quantite?:     number | null;
  origine?:      string | null;
  ristourne?:    number | null;
  poids?:        number | null;
  contrePesage?: boolean;
  emplacement?:  string | null;
  nbSousVide?:   number | null;
  odeur?:        string | null;
  etatFondu?:    boolean | null;
  moisissure?:   boolean | null;
  validatedAt?:  string | null;
}

interface ReceptionSectionProps {
  lotId: string;
  data?: ReceptionData | null;
}

export const ReceptionSection: React.FC<ReceptionSectionProps> = ({ lotId, data }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    quantite:     data?.quantite     != null ? String(data.quantite)     : '',
    origine:      data?.origine      ?? '',
    ristourne:    data?.ristourne    != null ? String(data.ristourne)    : '',
    poids:        data?.poids        != null ? String(data.poids)        : '',
    contrePesage: data?.contrePesage ?? false,
    emplacement:  data?.emplacement  ?? '',
    nbSousVide:   data?.nbSousVide   != null ? String(data.nbSousVide)   : '',
    odeur:        data?.odeur        ?? '',
    etatFondu:    data?.etatFondu    ?? false,
    moisissure:   data?.moisissure   ?? false,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      quantite:     data.quantite     != null ? String(data.quantite)     : '',
      origine:      data.origine      ?? '',
      ristourne:    data.ristourne    != null ? String(data.ristourne)    : '',
      poids:        data.poids        != null ? String(data.poids)        : '',
      contrePesage: data.contrePesage ?? false,
      emplacement:  data.emplacement  ?? '',
      nbSousVide:   data.nbSousVide   != null ? String(data.nbSousVide)   : '',
      odeur:        data?.odeur        ?? '',
      etatFondu:    data?.etatFondu    ?? false,
      moisissure:   data?.moisissure   ?? false,
    });
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-reception', lotId] });

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/lots/${lotId}/reception`, payload),
    onSuccess: () => { invalidate(); toast.success('Réception enregistrée'); },
    onError:   () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const isLocked = !!data?.validatedAt;

  const buildPayload = (validate = false) => ({
    quantite:     form.quantite     ? parseFloat(form.quantite)     : undefined,
    origine:      form.origine      || undefined,
    ristourne:    form.ristourne    ? parseFloat(form.ristourne)    : undefined,
    poids:        form.poids        ? parseFloat(form.poids)        : undefined,
    contrePesage: form.contrePesage,
    emplacement:  form.emplacement  || undefined,
    nbSousVide:   form.nbSousVide   ? parseInt(form.nbSousVide)     : undefined,
    odeur:        form.odeur        || undefined,
    etatFondu:    form.etatFondu,
    moisissure:   form.moisissure,
    ...(validate ? { validatedAt: new Date().toISOString() } : {}),
  });

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );

  return (
    <Card>
      <CardHeader
        title="Réception"
        subtitle="Bon de livraison · Contre-pesage · Échantillonnage"
        action={isLocked ? (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={14} /> Validée
          </span>
        ) : undefined}
      />

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Bon de Livraison
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité (kg)">
              <input type="number" step="0.1" className="input" disabled={isLocked}
                value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0.0" />
            </Field>
            <Field label="Origine">
              <input className="input" disabled={isLocked}
                value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value }))} placeholder="Région / Zone" />
            </Field>
            <Field label="Ristourne (taxe état)">
              <input type="number" step="0.01" className="input" disabled={isLocked}
                value={form.ristourne} onChange={e => setForm(f => ({ ...f, ristourne: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Poids constaté (kg)">
              <input type="number" step="0.1" className="input" disabled={isLocked}
                value={form.poids} onChange={e => setForm(f => ({ ...f, poids: e.target.value }))} placeholder="0.0" />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.contrePesage} disabled={isLocked}
              onChange={e => setForm(f => ({ ...f, contrePesage: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-300">Contre-pesage effectué</span>
          </label>
          <Field label="Emplacement / Quarantaine">
            <input className="input" disabled={isLocked}
              value={form.emplacement} onChange={e => setForm(f => ({ ...f, emplacement: e.target.value }))} placeholder="Zone brute — quarantaine" />
          </Field>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Échantillonnage — Vérification qualité
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nb sous-vide prélevés (cible : 10)">
              <input type="number" className="input" disabled={isLocked}
                value={form.nbSousVide} onChange={e => setForm(f => ({ ...f, nbSousVide: e.target.value }))} placeholder="10" />
            </Field>
            <Field label="Odeur">
              <input className="input" disabled={isLocked}
                value={form.odeur} onChange={e => setForm(f => ({ ...f, odeur: e.target.value }))} placeholder="Observations odeur..." />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.etatFondu} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, etatFondu: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-300">Fondu</span>
              <span className="text-xs text-gray-500">(décoché = Non Fondu)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.moisissure} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, moisissure: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-300">Moisissure détectée</span>
            </label>
          </div>
        </div>

        {!isLocked && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(false))}>
              Enregistrer
            </Button>
            <Button size="sm" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(true))}>
              Valider la réception
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
