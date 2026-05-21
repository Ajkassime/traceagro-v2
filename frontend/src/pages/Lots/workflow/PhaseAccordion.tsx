import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { TeamTable } from './TeamTable';
import type { TeamMember } from './TeamTable';
import toast from 'react-hot-toast';

interface PhaseData {
  id: string;
  phaseType: string;
  phaseIndex: number;
  vanillaType: string;
  nomResponsable?: string | null;
  poids?: number | null;
  isValidated: boolean;
  qualiteOk?: boolean | null;
  isNouvelEmploye: boolean;
  autres?: string | null;
  nbSachets?: number | null;
  teamMembers: TeamMember[];
}

interface PhaseAccordionProps {
  lotId: string;
  vanillaType: 'non_conditionne' | 'conditionne';
  phaseType: string;
  phaseIndex: number;
  label: string;
  quotaLabel: string | null;
  data?: PhaseData;
}

export const PhaseAccordion: React.FC<PhaseAccordionProps> = ({
  lotId, vanillaType, phaseType, phaseIndex, label, quotaLabel, data,
}) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nomResponsable:  data?.nomResponsable  ?? '',
    poids:           data?.poids           != null ? String(data.poids) : '',
    qualiteOk:       data?.qualiteOk       ?? false,
    isNouvelEmploye: data?.isNouvelEmploye ?? false,
    autres:          data?.autres          ?? '',
    nbSachets:       data?.nbSachets       != null ? String(data.nbSachets) : '',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      nomResponsable:  data.nomResponsable  ?? '',
      poids:           data.poids           != null ? String(data.poids) : '',
      qualiteOk:       data.qualiteOk       ?? false,
      isNouvelEmploye: data.isNouvelEmploye ?? false,
      autres:          data.autres          ?? '',
      nbSachets:       data.nbSachets       != null ? String(data.nbSachets) : '',
    });
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-workflow', lotId] });

  const saveMutation = useMutation({
    mutationFn: (payload: object) =>
      api.put(`/lots/${lotId}/workflow/phases/${vanillaType}/${phaseType}/${phaseIndex}`, payload),
    onSuccess: () => { invalidate(); toast.success('Phase enregistrée'); },
    onError:   () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      nomResponsable:  form.nomResponsable  || undefined,
      poids:           form.poids           ? parseFloat(form.poids)   : undefined,
      qualiteOk:       vanillaType === 'conditionne' ? form.qualiteOk : undefined,
      isNouvelEmploye: phaseType === 'mesurage' ? form.isNouvelEmploye : undefined,
      autres:          phaseType === 'detecteur_metaux' ? form.autres || undefined : undefined,
      nbSachets:       phaseType === 'sous_vide' && form.nbSachets ? parseInt(form.nbSachets, 10) : undefined,
    });
  };

  const handleValidate = () => {
    saveMutation.mutate({ isValidated: true }, {
      onSuccess: () => { invalidate(); toast.success('Phase validée'); setOpen(false); },
    });
  };

  const isLocked    = data?.isValidated ?? false;

  const effectiveQuota = phaseType === 'mesurage' && form.isNouvelEmploye
    ? '15 kg/jour/pers'
    : quotaLabel;

  return (
    <div className="rounded-xl border transition-all duration-200"
      style={{
        borderColor: isLocked ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)',
        background:  isLocked ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          {isLocked
            ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            : <Clock size={16} className="text-gray-500 flex-shrink-0" />
          }
          <span className="font-medium text-white text-sm">{label}</span>
          {effectiveQuota && (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(42,122,144,0.2)', color: '#2a7a90' }}>
              {effectiveQuota}
            </span>
          )}
          {isLocked && (
            <span className="text-xs flex items-center gap-1 text-gray-500">
              <Lock size={11} /> Verrouillé
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="pt-4 space-y-3">

            {phaseType !== 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nom responsable</label>
                <input
                  className="input"
                  value={form.nomResponsable}
                  onChange={e => setForm(f => ({ ...f, nomResponsable: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Anarana responsable"
                />
              </div>
            )}

            {phaseType !== 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.poids}
                  onChange={e => setForm(f => ({ ...f, poids: e.target.value }))}
                  disabled={isLocked}
                  placeholder="0.0"
                />
              </div>
            )}

            {phaseType === 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Autres</label>
                <input
                  className="input"
                  value={form.autres}
                  onChange={e => setForm(f => ({ ...f, autres: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Observations..."
                />
              </div>
            )}

            {phaseType === 'sous_vide' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre de sachets</label>
                <input
                  type="number"
                  className="input"
                  value={form.nbSachets}
                  onChange={e => setForm(f => ({ ...f, nbSachets: e.target.value }))}
                  disabled={isLocked}
                  placeholder="0"
                />
              </div>
            )}

            {phaseType === 'mesurage' && !isLocked && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNouvelEmploye}
                  onChange={e => setForm(f => ({ ...f, isNouvelEmploye: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Nouvel employé</span>
                <span className="text-xs text-gray-500">(quota : 15 kg/jour/pers)</span>
              </label>
            )}

            {vanillaType === 'conditionne' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.qualiteOk ?? false}
                  onChange={e => setForm(f => ({ ...f, qualiteOk: e.target.checked }))}
                  disabled={isLocked}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Équipe Qualité ✓</span>
              </label>
            )}

            {!isLocked && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" loading={saveMutation.isPending} onClick={handleSave}>
                  Enregistrer
                </Button>
                <Button size="sm" onClick={handleValidate} loading={saveMutation.isPending}>
                  Valider la phase
                </Button>
              </div>
            )}
          </div>

          {data?.id && (
            <TeamTable
              lotId={lotId}
              phaseId={data.id}
              members={data.teamMembers}
              isLocked={isLocked}
            />
          )}
          {!data?.id && !isLocked && (
            <p className="mt-3 text-xs text-gray-500">Enregistrez d'abord la phase pour ajouter des membres.</p>
          )}
        </div>
      )}
    </div>
  );
};
