import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Factory, Ship, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
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
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" subtitle="Vue d'ensemble de la plateforme" />

      <div className="flex-1 p-6 space-y-6 animate-fade-in">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Lots"
            value={stats?.totalLots ?? 0}
            icon={<Package size={20} />}
            color="text-forest-400"
          />
          <StatCard
            title="Conditionnement"
            value={conditioning?.stats?.en_cours ?? 0}
            icon={<Factory size={20} />}
            color="text-apl-gold"
          />
          <StatCard
            title="En transit"
            value={stats?.inTransit ?? 0}
            icon={<Ship size={20} />}
            color="text-orange-400"
          />
          <StatCard
            title="Exportés"
            value={stats?.exported ?? 0}
            icon={<CheckCircle size={20} />}
            color="text-vanilla-400"
          />
        </div>

        {/* Chart + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3">
            <CardHeader title="Lots par statut" subtitle="Répartition actuelle" />
            <LotsBarChart data={stats?.byStatus ?? []} />
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="⚡ Insights IA"
              subtitle="Analyses en temps réel"
              action={
                <button onClick={() => navigate('/intelligence')} className="text-xs text-forest-400 hover:text-forest-300">
                  Voir tout →
                </button>
              }
            />
            {insightsLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
            ) : (insights ?? []).length > 0 ? (
              <div className="space-y-2">
                {(insights ?? []).slice(0, 4).map((insight: any, i: number) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-gray-500">
                <CheckCircle size={32} className="text-forest-600 mb-2" />
                <p className="text-sm">Tout est en ordre ✅</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recent lots table */}
        <Card>
          <CardHeader
            title="Lots récents"
            subtitle="6 derniers lots enregistrés"
            action={
              <button onClick={() => navigate('/lots')} className="text-xs text-forest-400 hover:text-forest-300">
                Voir tous →
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Lot', 'Produit', 'Producteur', 'Quantité', 'Qualité', 'Statut', 'Date'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.recentLots ?? []).map((lot: any) => (
                  <tr
                    key={lot.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => navigate(`/lots/${lot.id}`)}
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-forest-400">{lot.lotNumber}</td>
                    <td className="py-2.5 px-3 text-gray-300">{lot.product?.name}</td>
                    <td className="py-2.5 px-3 text-gray-300">{lot.producer?.name}</td>
                    <td className="py-2.5 px-3 text-gray-400">{formatKg(lot.quantityKg)}</td>
                    <td className="py-2.5 px-3"><ScoreBadge score={lot.qualityScore} /></td>
                    <td className="py-2.5 px-3">
                      <StatusBadge config={LOT_STATUS_CONFIG[lot.status]} />
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{formatDate(lot.harvestDate)}</td>
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
