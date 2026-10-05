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
                  <div key={i} className={`rounded-[6px] p-3.5 border flex gap-3 ${a.severity === 'critical' ? 'border-[#963C47]/30 bg-[#F8E6E8]' : 'border-[#795015]/30 bg-[#F5E8CC]'}`}>
                    <AlertTriangle size={16} className={a.severity === 'critical' ? 'text-[#963C47] mt-0.5' : 'text-[#795015] mt-0.5'} />
                    <div>
                      <p className="text-sm font-semibold text-[#352638]">{a.description}</p>
                      {a.lotNumber && <p className="text-xs text-[#70656B] mt-0.5 font-mono">{a.lotNumber}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Trend chart */}
          <Card>
            <CardHeader title="Tendances sur 6 mois" subtitle="Évolution des volumes et qualités" />
            {trendsLoading ? <PageLoader /> : <TrendLineChart data={trends ?? []} />}
          </Card>
        </div>

        {/* Right: Ranking + Assistant */}
        <div className="space-y-4">
          {/* Producer ranking */}
          <Card>
            <CardHeader title="Classement des Producteurs" subtitle="Score de régularité et qualité" />
            <div className="space-y-2.5">
              {(ranking ?? []).slice(0, 8).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-[#D8CEC4]/50 last:border-0">
                  <span className={`text-sm font-serif font-bold w-5 text-center ${i === 0 ? 'text-[#AD5138]' : 'text-[#70656B]'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#352638] truncate">{p.name}</p>
                    <p className="text-xs text-[#70656B]">{p.region} · {p.totalLots} lots</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-bold ${p.score >= 8 ? 'text-[#435432]' : p.score >= 6 ? 'text-[#795015]' : 'text-[#963C47]'}`}>{p.score}</p>
                    <p className="text-[10px] text-[#70656B]">/10</p>
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
