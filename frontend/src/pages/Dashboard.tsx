import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Factory, Ship, CheckCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard, Card, CardHeader } from '../components/ui/Card';
import { LotsBarChart } from '../components/charts/LotsBarChart';
import { InsightCard } from '../components/intelligence/InsightCard';
import { PageLoader } from '../components/ui/Spinner';
import { StatusBadge, ScoreBadge } from '../components/ui/Badge';
import { LOT_STATUS_CONFIG, formatDate, formatKg } from '../lib/utils';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/lots/dashboard-stats').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const { data: conditioning } = useQuery({
    queryKey: ['conditioning-stats'],
    queryFn: () => api.get('/conditioning?status=en_cours').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/intelligence/insights').then((r) => r.data.data),
    refetchInterval: 120000,
  });

  if (statsLoading) return <PageLoader />;

  return (
    <div className="flex flex-col min-h-full bg-[#F5F0E7]">
      <Header title="Tableau de bord" subtitle="Registre général et indicateurs de traçabilité" />

      <div className="flex-1 p-4 md:p-8 space-y-6 animate-fade-in max-w-[1440px] w-full mx-auto">

        {/* Cartes KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Lots"
            value={stats?.totalLots ?? 0}
            icon={<Package size={20} />}
          />
          <StatCard
            title="Conditionnement"
            value={conditioning?.stats?.en_cours ?? 0}
            icon={<Factory size={20} />}
          />
          <StatCard
            title="En transit"
            value={stats?.inTransit ?? 0}
            icon={<Ship size={20} />}
          />
          <StatCard
            title="Exportés"
            value={stats?.exported ?? 0}
            icon={<CheckCircle size={20} />}
          />
        </div>

        {/* Graphique et Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader title="Lots par statut" subtitle="Répartition actuelle du registre" />
            <LotsBarChart data={stats?.byStatus ?? []} />
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Analyses & Signaux"
              subtitle="Contrôles automatiques de traçabilité"
              action={
                <button
                  onClick={() => navigate('/intelligence')}
                  className="text-xs font-semibold text-[#AD5138] hover:underline"
                >
                  Tout consulter →
                </button>
              }
            />
            {insightsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-[6px] bg-[#EAE2EB]/60 animate-pulse" />
                ))}
              </div>
            ) : (insights ?? []).length > 0 ? (
              <div className="space-y-2.5">
                {(insights ?? []).slice(0, 4).map((insight: any, i: number) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle size={32} className="text-[#435432] mb-2" />
                <p className="text-sm font-semibold text-[#435432]">Tous les registres sont conformes</p>
                <p className="text-xs text-[#70656B] mt-0.5">Aucune anomalie détectée sur les lots actifs</p>
              </div>
            )}
          </Card>
        </div>

        {/* Tableau des lots récents */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <CardHeader
              title="Dernières entrées au registre"
              subtitle="6 derniers lots documentés"
              action={
                <button
                  onClick={() => navigate('/lots')}
                  className="text-xs font-semibold text-[#AD5138] hover:underline"
                >
                  Voir l'ensemble du registre →
                </button>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F0E7]/60">
                <tr className="border-b border-[#D8CEC4]">
                  {['N° Lot', 'Produit', 'Producteur', 'Quantité', 'Qualité', 'Statut', 'Date de récolte'].map((h) => (
                    <th key={h} className="text-left py-3 px-6 text-xs text-[#70656B] font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CEC4]/60">
                {(stats?.recentLots ?? []).map((lot: any) => (
                  <tr
                    key={lot.id}
                    className="hover:bg-[#F5F0E7]/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/lots/${lot.id}`)}
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-[#352638]">{lot.lotNumber}</td>
                    <td className="py-3.5 px-6 text-[#352638] font-medium">{lot.product?.name}</td>
                    <td className="py-3.5 px-6 text-[#70656B]">{lot.producer?.name}</td>
                    <td className="py-3.5 px-6 text-[#352638] font-semibold text-right tabular-nums">{formatKg(lot.quantityKg)}</td>
                    <td className="py-3.5 px-6"><ScoreBadge score={lot.qualityScore} /></td>
                    <td className="py-3.5 px-6">
                      <StatusBadge config={LOT_STATUS_CONFIG[lot.status] || { label: lot.status }} />
                    </td>
                    <td className="py-3.5 px-6 text-[#70656B] text-xs">{formatDate(lot.harvestDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
};
