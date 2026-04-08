import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Eye, Globe, Smartphone, TrendingUp, Clock } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { PageLoader } from '../ui/Spinner';
import { cn, formatDate } from '../../lib/utils';
import api from '../../lib/api';

interface ScanAnalyticsProps {
  lotId: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export const ScanAnalyticsDashboard: React.FC<ScanAnalyticsProps> = ({ lotId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['scan-analytics', lotId],
    queryFn:  () => api.get(`/lots/${lotId}/scan-analytics`).then(r => r.data.data),
    refetchInterval: 30_000, // Refresh toutes les 30 secondes
  });

  if (isLoading) return <PageLoader />;
  if (!data)     return null;

  const { total, byDay, byCountry, byDevice, recent } = data;

  // Calculer la tendance (derniers 7j vs 7j précédents)
  const now   = Date.now();
  const day7  = byDay.filter((d: any) => new Date(d.day).getTime() > now - 7 * 86400000).reduce((s: number, d: any) => s + d.count, 0);
  const day14 = byDay.filter((d: any) => {
    const t = new Date(d.day).getTime();
    return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
  }).reduce((s: number, d: any) => s + d.count, 0);
  const trend = day14 > 0 ? Math.round(((day7 - day14) / day14) * 100) : null;

  // Formater les dates du graphe
  const chartData = byDay.map((d: any) => ({
    day:   new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    scans: d.count,
  }));

  // Device icons
  const deviceIcon = (d: string) => {
    if (/iPhone|Android Mobile/.test(d)) return '📱';
    if (/iPad|Android Tablet/.test(d))   return '📲';
    if (/Mac|Windows|Linux/.test(d))     return '💻';
    return '🔷';
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Eye size={18} />}
          label="Total scans"
          value={total}
          color="text-forest-400"
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="7 derniers jours"
          value={day7}
          trend={trend}
          color="text-blue-400"
        />
        <KpiCard
          icon={<Globe size={18} />}
          label="Pays distincts"
          value={byCountry.length}
          color="text-vanilla-400"
        />
      </div>

      {/* Graphe temporel */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader title="📈 Scans sur 30 jours" subtitle="Évolution quotidienne" />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6e7681' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6e7681' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#c9d1d9' }}
                  itemStyle={{ color: '#22c55e' }}
                />
                <Area type="monotone" dataKey="scans" name="Scans" stroke="#22c55e" strokeWidth={2} fill="url(#scanGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="📈 Scans sur 30 jours" />
          <div className="text-center py-6 text-gray-500 text-sm">
            <Eye size={24} className="mx-auto mb-2 opacity-30" />
            Aucun scan enregistré pour le moment
          </div>
        </Card>
      )}

      {/* Pays + Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Par pays */}
        <Card>
          <CardHeader title="🌍 Par pays" subtitle={`${byCountry.length} pays`} />
          {byCountry.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucune donnée</p>
          ) : (
            <div className="space-y-2">
              {byCountry.slice(0, 6).map((c: any, i: number) => {
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 truncate">{c.country}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs font-mono" style={{ color: COLORS[i % COLORS.length], minWidth: 24, textAlign: 'right' }}>
                      {c.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Par appareil */}
        <Card>
          <CardHeader title="📱 Par appareil" subtitle="Type de device" />
          {byDevice.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucune donnée</p>
          ) : byDevice.length <= 4 ? (
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byDevice} dataKey="count" nameKey="device" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {byDevice.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, n: any) => [v, n]}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-2">
              {byDevice.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span>{deviceIcon(d.device)}</span>
                  <span className="text-gray-400 flex-1">{d.device}</span>
                  <span className="font-mono" style={{ color: COLORS[i % COLORS.length] }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Scans récents */}
      {recent.length > 0 && (
        <Card>
          <CardHeader title="🕐 Derniers scans" subtitle="5 scans les plus récents" />
          <div className="space-y-2">
            {recent.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                <span className="text-base">{deviceIcon(s.device || '')}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {s.city && s.city !== 'Inconnue' ? `${s.city}, ` : ''}{s.country || 'Inconnu'}
                  </p>
                  <p className="text-xs text-gray-500">{s.device || 'Inconnu'}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={11} />
                  <span>{formatDate(s.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Note anti-fraude */}
      {total > 0 && (
        <div className="rounded-xl p-3 text-xs" style={{ background: '#1b433210', border: '1px solid #2d6a4f30' }}>
          <p className="text-[#52b788] font-medium mb-1">🛡️ Surveillance anti-contrefaçon active</p>
          <p style={{ color: '#6e7681' }}>
            {total < 10
              ? `${total} scan(s) — Volume normal. Aucune anomalie détectée.`
              : total > 500
              ? `⚠️ ${total} scans — Volume élevé. Vérifiez l'activité.`
              : `${total} scans — Volume normal. Aucune anomalie détectée.`
            }
          </p>
        </div>
      )}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: number; trend?: number | null; color: string }> = ({ icon, label, value, trend, color }) => (
  <div className="card p-3 flex flex-col gap-1">
    <div className={cn('flex items-center gap-1.5', color)}>{icon}<span className="text-xs text-gray-500">{label}</span></div>
    <p className={cn('text-xl font-bold font-display', color)}>{value.toLocaleString()}</p>
    {trend !== null && trend !== undefined && (
      <p className={cn('text-xs', trend >= 0 ? 'text-forest-400' : 'text-red-400')}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs sem. préc.
      </p>
    )}
  </div>
);
