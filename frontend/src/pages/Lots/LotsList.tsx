import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput, Select } from '../../components/ui/Input';
import { StatusBadge, ScoreBadge } from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { LOT_STATUS_CONFIG, formatDate, formatKg } from '../../lib/utils';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { LotCreate } from './LotCreate';

export const LotsList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lots', page, search, status],
    queryFn: () => api.get('/lots', { params: { page, limit: 20, search: search || undefined, status: status || undefined } }).then((r) => r.data),
  });

  const lots = data?.data ?? [];
  const pagination = data?.pagination;

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'harvest', label: 'Récolte' },
    { value: 'processing', label: 'Transformation' },
    { value: 'processed', label: 'Transformé' },
    { value: 'transit', label: 'En transit' },
    { value: 'exported', label: 'Exporté' },
    { value: 'rejected', label: 'Rejeté' },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#F5F0E7]">
      <Header
        title="Lots"
        subtitle={`${pagination?.total ?? 0} lots enregistrés dans le registre`}
        action={
          <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
            Nouveau lot
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-8 space-y-5 animate-fade-in max-w-[1440px] w-full mx-auto">
        {/* Filtres regroupés */}
        <div className="bg-[#FFFCF6] p-4 rounded-[8px] border border-[#D8CEC4] flex flex-wrap gap-4 items-center justify-between shadow-xs">
          <div className="flex flex-wrap gap-3 flex-1 min-w-0">
            <SearchInput
              placeholder="Rechercher par référence, producteur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-sm"
            />
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="max-w-[200px]"
            />
          </div>
        </div>

        {/* Tableau aéré */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <PageLoader />
          ) : lots.length === 0 ? (
            <EmptyState
              title="Aucun lot trouvé"
              description="Créez une première entrée au registre ou ajustez vos critères de recherche."
              icon={<Package size={40} />}
              action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Créer un lot</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F0E7]/60">
                  <tr className="border-b border-[#D8CEC4]">
                    {['N° Lot', 'Produit', 'Type', 'Producteur', 'Récolte', 'Total', 'Disponible', 'Qualité', 'Statut', 'Créé le'].map((h) => (
                      <th
                        key={h}
                        className={h === 'Total' || h === 'Disponible' ? 'text-right py-3.5 px-4 text-xs text-[#70656B] font-semibold uppercase tracking-wider' : 'text-left py-3.5 px-4 text-xs text-[#70656B] font-semibold uppercase tracking-wider'}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8CEC4]/60">
                  {lots.map((lot: any) => (
                    <tr
                      key={lot.id}
                      className="hover:bg-[#F5F0E7]/50 cursor-pointer transition-colors group min-h-[52px]"
                      onClick={() => navigate(`/lots/${lot.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-[#352638] group-hover:text-[#AD5138]">
                          {lot.lotNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#352638]">
                        {lot.product?.name ?? '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {lot.conditioningType ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[4px] bg-[#EAE2EB] text-[#352638] font-medium">
                            {lot.conditioningType === 'vanille_noire' ? '🖤 Noire' : '🔴 Rouge'}
                          </span>
                        ) : (
                          <span className="text-xs text-[#70656B]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#70656B]">
                        {lot.producer?.name ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#70656B] text-xs">
                        {formatDate(lot.harvestDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-[#352638] font-medium">
                        {formatKg(lot.quantityKg)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {lot.availableKg !== null && lot.availableKg !== undefined ? (
                          <span className={`font-semibold ${
                            lot.availableKg <= 0 ? 'text-[#963C47]' :
                            lot.availableKg < lot.quantityKg * 0.2 ? 'text-[#795015]' :
                            'text-[#435432]'
                          }`}>
                            {formatKg(lot.availableKg)}
                            {lot.availableKg <= 0 && <span className="ml-1 text-xs text-[#963C47]">(épuisé)</span>}
                          </span>
                        ) : (
                          <span className="text-[#435432] font-semibold">{formatKg(lot.quantityKg)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <ScoreBadge score={lot.qualityScore} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge config={LOT_STATUS_CONFIG[lot.status] || { label: lot.status }} />
                      </td>
                      <td className="py-3.5 px-4 text-[#70656B] text-xs">
                        {formatDate(lot.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#D8CEC4] bg-[#FFFCF6]">
              <p className="text-xs text-[#70656B]">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} lots)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un nouveau lot" size="lg">
        <LotCreate onSuccess={() => { setCreateOpen(false); }} />
      </Modal>
    </div>
  );
};
