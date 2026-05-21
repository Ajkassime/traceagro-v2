import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  nom: string;
  quotas?: number | null;
  activite?: string | null;
  quantiteFini?: number | null;
  observation?: string | null;
}

interface TeamTableProps {
  lotId: string;
  phaseId: string;
  members: TeamMember[];
  isLocked: boolean;
}

const EMPTY_MEMBER = { nom: '', quotas: '', activite: '', quantiteFini: '', observation: '' };

export const TeamTable: React.FC<TeamTableProps> = ({ lotId, phaseId, members, isLocked }) => {
  const qc = useQueryClient();
  const [newRow, setNewRow] = useState(EMPTY_MEMBER);
  const [addingRow, setAddingRow] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-workflow', lotId] });

  const addMember = useMutation({
    mutationFn: (data: typeof EMPTY_MEMBER) =>
      api.post(`/lots/${lotId}/workflow/phases/${phaseId}/team`, {
        nom:          data.nom,
        quotas:       data.quotas       ? parseFloat(data.quotas)       : undefined,
        activite:     data.activite     || undefined,
        quantiteFini: data.quantiteFini ? parseFloat(data.quantiteFini) : undefined,
        observation:  data.observation  || undefined,
      }),
    onSuccess: () => { invalidate(); setNewRow(EMPTY_MEMBER); setAddingRow(false); toast.success('Membre ajouté'); },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const deleteMember = useMutation({
    mutationFn: (memberId: string) => {
      setPendingDeleteIds(s => new Set(s).add(memberId));
      return api.delete(`/lots/${lotId}/workflow/phases/${phaseId}/team/${memberId}`);
    },
    onSettled: (_: any, __: any, memberId: string) => {
      setPendingDeleteIds(s => { const n = new Set(s); n.delete(memberId); return n; });
    },
    onSuccess: () => { invalidate(); toast.success('Membre supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-navy-400)' }}>
        Formulaire équipe
      </p>
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Nom', 'Quotas', 'Activité', 'Qté fini', 'Observation', ''].map((h, i) => (
                <th key={i} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-navy-400)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="px-3 py-2 text-white">{m.nom}</td>
                <td className="px-3 py-2 text-gray-300">{m.quotas ?? '—'}</td>
                <td className="px-3 py-2 text-gray-300">{m.activite ?? '—'}</td>
                <td className="px-3 py-2 text-gray-300">{m.quantiteFini ?? '—'}</td>
                <td className="px-3 py-2 text-gray-400 max-w-xs truncate">{m.observation ?? '—'}</td>
                <td className="px-3 py-2">
                  {!isLocked && (
                    <button
                      onClick={() => deleteMember.mutate(m.id)}
                      disabled={pendingDeleteIds.has(m.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {addingRow && (
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {(['nom', 'quotas', 'activite', 'quantiteFini', 'observation'] as const).map(field => (
                  <td key={field} className="px-2 py-1.5">
                    <input
                      className="input text-xs py-1"
                      placeholder={field === 'nom' ? 'Nom *' : field}
                      value={newRow[field]}
                      onChange={e => setNewRow(r => ({ ...r, [field]: e.target.value }))}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                  <Button
                    size="sm"
                    loading={addMember.isPending}
                    onClick={() => { if (newRow.nom.trim()) addMember.mutate(newRow); else toast.error('Nom requis'); }}
                  >
                    OK
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingRow(false); setNewRow(EMPTY_MEMBER); }}>
                    ✕
                  </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLocked && !addingRow && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={13} />}
          className="mt-2"
          onClick={() => setAddingRow(true)}
        >
          Ajouter membre
        </Button>
      )}
    </div>
  );
};
