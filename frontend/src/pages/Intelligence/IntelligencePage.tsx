import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, AlertTriangle, Trophy } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { InsightCard } from '../../components/intelligence/InsightCard';
import { AIAssistant } from '../../components/intelligence/AIAssistant';
import { TrendLineChart } from '../../components/charts/TrendLineChart';
import { PageLoader } from '../../components/ui/Spinner';
import api from '../../lib/api';

export const IntelligencePage: React.FC = () => {
  const { data: insights } = useQuery({ queryKey: ['insights'], queryFn: () => api.get('/intelligence/insights').then((r) => r.data.data) });
  const { data: anomalies } = useQuery({ queryKey: ['anomalies'], queryFn: () => api.get('/intelligence/anomalies').then((r) => r.data.data) });
  const { data: trends, isLoading: trendsLoading } = useQuery({ queryKey: ['trends'], queryFn: () => api.get('/intelligence/trends').then((r) => r.data.data) });
  const { data: ranking } = useQuery({ queryKey: ['producer-ranking'], queryFn: () => api.get('/intelligence/producer-ranking').then((r) => r.data.data) });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Intelligence IA" subtitle="Analyses, anomalies et insights automatiques" />
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">

        {/* Left: Insights + Anomalies */}
        <div className="lg:col-span-2 space-y-4">
          {/* Insights */}
          <Card>
            <CardHeader title="⚡ Insights Automatiques" subtitle="Mis à jour en temps réel" />
            <div className="space-y-2">
              {(insights ?? []).length === 0
                ? <p className="text-sm text-gray-500 text-center py-4">✅ Aucun insight critique détecté</p>
                : (insights ?? []).map((insight: any, i: number) => <InsightCard key={i} insight={insight} />)
              }
            </div>
          </Card>

          {/* Anomalies */}
          <Card>
            <CardHeader title="🔍 Anomalies Détectées" subtitle={`${(anomalies ?? []).length} anomalie(s)`} />
            {(anomalies ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">✅ Aucune anomalie détectée</p>
            ) : (
              <div className="space-y-2">
                {(anomalies ?? []).map((a: any, i: number) => (
                  <div key={i} className={`rounded-lg p-3 border flex gap-3 ${a.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-vanilla-500/30 bg-vanilla-500/5'}`}>
                    <AlertTriangle size={16} className={a.severity === 'critical' ? 'text-red-400 mt-0.5' : 'text-vanilla-400 mt-0.5'} />
                    <div>
                      <p className="text-sm text-white">{a.description}</p>
                      {a.lotNumber && <p className="text-xs text-gray-500 mt-0.5 font-mono">{a.lotNumber}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Trend chart */}
          <Card>
            <CardHeader title="📈 Tendances sur 6 mois" />
            {trendsLoading ? <PageLoader /> : <TrendLineChart data={trends ?? []} />}
          </Card>
        </div>

        {/* Right: Ranking + Assistant */}
        <div className="space-y-4">
          {/* Producer ranking */}
          <Card>
            <CardHeader title="🏆 Classement Producteurs" subtitle="Score IA composite" />
            <div className="space-y-2">
              {(ranking ?? []).slice(0, 8).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 py-1">
                  <span className={`text-sm font-bold w-5 text-center ${i === 0 ? 'text-vanilla-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-600">{p.region} · {p.totalLots} lots</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${p.score >= 8 ? 'text-forest-400' : p.score >= 6 ? 'text-vanilla-400' : 'text-orange-400'}`}>{p.score}</p>
                    <p className="text-xs text-gray-600">/10</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Assistant */}
          <div style={{ height: '460px', display: 'flex', flexDirection: 'column' }}><Card className="p-0 flex-1 flex flex-col">
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              <Brain size={16} className="text-forest-400" />
              <h3 className="font-display font-semibold text-white text-sm">Assistant IA</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIAssistant />
            </div>
          </Card></div>
        </div>
      </div>
    </div>
  );
};
