import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Filter } from 'lucide-react';
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
import toast from 'react-hot-toast';
import { LotCreate } from './LotCreate';

export const LotsList: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
    <div className="flex flex-col min-h-full">
      <Header title="Lots" subtitle={`${pagination?.total ?? 0} lots au total`}>
      </Header>

      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-1 min-w-0">
            <SearchInput
              placeholder="Rechercher un lot, producteur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="max-w-[180px]"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
            Nouveau lot
          </Button>
        </div>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <PageLoader />
          ) : lots.length === 0 ? (
            <EmptyState
              title="Aucun lot trouvé"
              description="Créez votre premier lot ou modifiez vos filtres de recherche."
              icon={<Package size={40} />}
              action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Créer un lot</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['N° Lot', 'Produit', 'Type', 'Producteur', 'Récolte', 'Quantité', 'Qualité', 'Statut', 'Créé le'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot: any) => (
                    <tr
                      key={lot.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      onClick={() => navigate(`/lots/${lot.id}`)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-forest-400 group-hover:text-forest-300">{lot.lotNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{lot.product?.name}</td>
                      <td className="py-3 px-4">
                        {lot.conditioningType ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            lot.conditioningType === 'vanille_noire'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {lot.conditioningType === 'vanille_noire' ? '🖤' : '❤️'}
                            {lot.conditioningType === 'vanille_noire' ? 'Noire' : 'Rouge'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-gray-300">{lot.producer?.name}</p>
                          <p className="text-xs text-gray-600">{lot.producer?.region}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(lot.harvestDate)}</td>
                      <td className="py-3 px-4 text-gray-400">{formatKg(lot.quantityKg)}</td>
                      <td className="py-3 px-4"><ScoreBadge score={lot.qualityScore} /></td>
                      <td className="py-3 px-4"><StatusBadge config={LOT_STATUS_CONFIG[lot.status]} /></td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{formatDate(lot.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>← Précédent</Button>
            <span className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Suivant →</Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un nouveau lot" size="lg">
        <LotCreate onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['lots'] }); }} />
      </Modal>
    </div>
  );
};
