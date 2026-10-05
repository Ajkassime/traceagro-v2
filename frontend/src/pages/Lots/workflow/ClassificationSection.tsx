import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../../../components/ui/Card';
import { PhaseAccordion } from './PhaseAccordion';
import type { TeamMember } from './TeamTable';

interface PhaseData {
  id: string;
  vanillaType: string;
  phaseType: string;
  phaseIndex: number;
  nomResponsable?: string | null;
  poids?: number | null;
  isValidated: boolean;
  qualiteOk?: boolean | null;
  isNouvelEmploye: boolean;
  autres?: string | null;
  nbSachets?: number | null;
  teamMembers: TeamMember[];
}

interface ClassificationSectionProps {
  lotId: string;
  phases: PhaseData[];
}

type VanillaType = 'non_conditionne' | 'conditionne';

const PHASE_SEQUENCE = [
  { phaseType: 'triage',           phaseIndex: 1, label: 'Triage',           quotaLabel: '35 kg/jour/pers' },
  { phaseType: 'lasoge',           phaseIndex: 1, label: 'Lasoge',           quotaLabel: '50 kg/jour/pers' },
  { phaseType: 'mesurage',         phaseIndex: 1, label: 'Mesurage',         quotaLabel: '30 kg/jour/pers' },
  { phaseType: 'lasoge',           phaseIndex: 2, label: 'Lasoge',           quotaLabel: '50 kg/jour/pers' },
  { phaseType: 'detecteur_metaux', phaseIndex: 1, label: 'Détecteur Métaux', quotaLabel: null },
  { phaseType: 'sous_vide',        phaseIndex: 1, label: 'Sous Vide',        quotaLabel: '75 sachets/j/pers · 350 kg/j/pers' },
] as const;

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({ lotId, phases }) => {
  const existingType = phases.length > 0
    ? (phases[0].vanillaType as VanillaType)
    : null;

  const [selectedType, setSelectedType] = useState<VanillaType | null>(existingType);

  useEffect(() => {
    if (existingType !== null) {
      setSelectedType(existingType);
    }
  }, [existingType]);

  const getPhaseData = (phaseType: string, phaseIndex: number) =>
    phases.find(p => p.phaseType === phaseType && p.phaseIndex === phaseIndex && p.vanillaType === selectedType);

  const validatedCount = PHASE_SEQUENCE.filter(
    ({ phaseType, phaseIndex }) => getPhaseData(phaseType, phaseIndex)?.isValidated
  ).length;

  return (
    <Card>
      <CardHeader
        title="Classification"
        subtitle={`${validatedCount} / ${PHASE_SEQUENCE.length} phases validées`}
      />

      {/* Vanilla type selector — locked once phases exist */}
      {!existingType && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Type de vanille reçue
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'non_conditionne' as const, label: 'Non conditionné', desc: 'Vanille brute — traitement complet requis' },
              { key: 'conditionne'     as const, label: 'Conditionné',     desc: 'Vanille déjà préparée — validation qualité requise' },
            ]).map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={`p-4 rounded-[8px] border text-left transition-all ${
                  selectedType === key
                    ? 'border-[#352638] bg-[#EAE2EB]'
                    : 'border-[#D8CEC4] bg-[#FFFCF6] hover:border-[#AD5138]'
                }`}
              >
                <p className="font-semibold text-sm text-[#352638]">{label}</p>
                <p className="text-xs text-[#70656B] mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {existingType && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[#EAE2EB] text-[#352638] border border-[#D8CEC4]">
            {existingType === 'non_conditionne' ? 'Non conditionné' : 'Conditionné'}
          </span>
          <span className="text-xs text-[#70656B]">Type verrouillé (phases en cours)</span>
        </div>
      )}

      {/* Progress bar */}
      {selectedType && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden bg-[#EAE2EB]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(validatedCount / PHASE_SEQUENCE.length) * 100}%`,
                background: validatedCount === PHASE_SEQUENCE.length ? '#435432' : '#352638',
              }}
            />
          </div>
        </div>
      )}

      {/* Phase accordions */}
      {selectedType && (
        <div className="space-y-2">
          {PHASE_SEQUENCE.map(({ phaseType, phaseIndex, label, quotaLabel }) => (
            <PhaseAccordion
              key={`${phaseType}-${phaseIndex}`}
              lotId={lotId}
              vanillaType={selectedType}
              phaseType={phaseType}
              phaseIndex={phaseIndex}
              label={label}
              quotaLabel={quotaLabel}
              data={getPhaseData(phaseType, phaseIndex)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
