import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, CheckCircle, Eye, Globe, Zap,
  Clock, Cpu, RefreshCw, Lock, Hash, Wifi, AlertCircle
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { PageLoader } from '../ui/Spinner';
import { formatDate } from '../../lib/utils';
import api from '../../lib/api';

/* ── Types ──────────────────────────────────────────────────────────────── */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface AntiFraudReport {
  lotId: string;
  lotNumber: string;
  confidenceScore: number;
  risk: RiskLevel;
  alerts: string[];
  verificationToken: string;
  stats: {
    total: number;
    last1h: number;
    last24h: number;
    last7d: number;
    suspicious: number;
  };
  activeIps: Array<{ ip: string; count: number; suspicious: boolean }>;
  recentCountries: Array<{ country: string; count: number }>;
  recentScans: Array<{
    id: string;
    ipAddress: string;
    country: string;
    city: string;
    device: string;
    isSuspicious: boolean;
    suspicionReason?: string;
    createdAt: string;
  }>;
  generatedAt: string;
}

/* ── Helpers visuels ────────────────────────────────────────────────────── */
const RISK_CONFIG: Record<RiskLevel, {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; ringColor: string;
}> = {
  low: {
    label: 'Risque faible',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    ringColor: '#22c55e',
    icon: <ShieldCheck size={20} className="text-emerald-400" />,
  },
  medium: {
    label: 'Risque modéré',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    ringColor: '#f59e0b',
    icon: <Shield size={20} className="text-amber-400" />,
  },
  high: {
    label: 'Risque élevé',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    ringColor: '#f97316',
    icon: <ShieldAlert size={20} className="text-orange-400" />,
  },
  critical: {
    label: 'Risque critique',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    ringColor: '#ef4444',
    icon: <ShieldX size={20} className="text-red-400" />,
  },
};

/* ── Jauge circulaire SVG ───────────────────────────────────────────────── */
const ConfidenceGauge: React.FC<{ score: number; risk: RiskLevel }> = ({ score, risk }) => {
  const cfg = RISK_CONFIG[risk];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          {/* Score arc */}
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={cfg.ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${cfg.color}`}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full ${cfg.bg} border ${cfg.border}`}>
        {cfg.icon}
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
    </div>
  );
};

/* ── Stat mini ──────────────────────────────────────────────────────────── */
const StatMini: React.FC<{ icon: React.ReactNode; label: string; value: number; color?: string; alert?: boolean }> = ({ icon, label, value, color, alert }) => (
  <div className={`flex flex-col p-3 rounded-xl border ${alert && value > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
    <div className={`flex items-center gap-1.5 mb-1 ${color || 'text-gray-400'}`}>
      {icon}
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <span className={`text-xl font-bold ${alert && value > 0 ? 'text-red-400' : 'text-white'}`}>{value.toLocaleString()}</span>
  </div>
);

/* ── Token de vérification ──────────────────────────────────────────────── */
const VerificationBadge: React.FC<{ token: string; lotNumber: string }> = ({ token, lotNumber }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Lock size={14} className="text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-400">Token de vérification HMAC</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Ce code cryptographique unique est généré à partir de l'identifiant du lot <strong className="text-white">{lotNumber}</strong>.
        Il permet à tout acheteur de vérifier l'authenticité du document sans accès à la base de données.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 p-2.5 bg-black/30 rounded-lg border border-white/10">
          <Hash size={12} className="text-emerald-400 flex-shrink-0" />
          <code className="text-base font-mono font-bold text-emerald-400 tracking-wider flex-1">{token}</code>
        </div>
        <button
          onClick={copy}
          className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
        >
          {copied ? '✅ Copié' : 'Copier'}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        SHA-256 HMAC · Renouvelé à chaque consultation · Visible sur la page publique
      </p>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
export const AntifraudPanel: React.FC<{ lotId: string }> = ({ lotId }) => {
  const { data: report, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['antifraud', lotId],
    queryFn: () => api.get(`/lots/${lotId}/antifraud`).then(r => r.data.data as AntiFraudReport),
    refetchInterval: 60_000, // Refresh auto toutes les 60s
  });

  if (isLoading) return <PageLoader />;
  if (!report)   return (
    <div className="text-center py-8 text-gray-500">
      <Shield size={32} className="mx-auto mb-2 opacity-30" />
      <p>Rapport anti-contrefaçon indisponible</p>
    </div>
  );

  const cfg = RISK_CONFIG[report.risk];
  const deviceIcon = (d: string) => {
    if (/iPhone|Android Mobile/i.test(d)) return '📱';
    if (/iPad|Tablet/i.test(d))           return '📲';
    if (/Windows/i.test(d))               return '🖥️';
    if (/Mac/i.test(d))                   return '💻';
    if (/Linux/i.test(d))                 return '🐧';
    return '🔷';
  };

  return (
    <div className="space-y-5">

      {/* ── En-tête + refresh ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Shield size={16} className="text-emerald-400" />
            Système anti-contrefaçon
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Dernière analyse : {new Date(report.generatedAt).toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400 hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ── Alerte critique ────────────────────────────────────────── */}
      {report.alerts.length > 0 && (
        <div className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className={cfg.color} />
            <div>
              <p className={`text-sm font-semibold ${cfg.color}`}>
                {report.alerts.length} alerte(s) détectée(s)
              </p>
              <ul className="mt-2 space-y-1">
                {report.alerts.map((a, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>⚠</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {report.alerts.length === 0 && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400 font-medium">Aucune anomalie détectée — QR code authentique</p>
        </div>
      )}

      {/* ── Score de confiance + stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Jauge */}
        <div className="flex justify-center">
          <ConfidenceGauge score={report.confidenceScore} risk={report.risk} />
        </div>

        {/* Stats scans */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini icon={<Eye size={14} />}        label="Total scans"   value={report.stats.total}     color="text-blue-400" />
          <StatMini icon={<Clock size={14} />}      label="Dernière 1h"  value={report.stats.last1h}    color="text-vanilla-400"
                    alert={report.stats.last1h > 20} />
          <StatMini icon={<Zap size={14} />}        label="24 heures"    value={report.stats.last24h}   color="text-purple-400" />
          <StatMini icon={<AlertCircle size={14} />} label="Suspects"    value={report.stats.suspicious} color="text-red-400"
                    alert={report.stats.suspicious > 0} />
        </div>
      </div>

      {/* ── Token HMAC ─────────────────────────────────────────────── */}
      <VerificationBadge token={report.verificationToken} lotNumber={report.lotNumber} />

      {/* ── IPs actives + pays ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* IPs dernière heure */}
        <Card>
          <CardHeader
            title="🌐 IPs actives (1h)"
            subtitle={`${report.activeIps.length} adresse(s) unique(s)`}
          />
          {report.activeIps.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucun scan dans la dernière heure</p>
          ) : (
            <div className="space-y-2 mt-3">
              {report.activeIps.map((ip, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg ${ip.suspicious ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2">
                    {ip.suspicious
                      ? <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                      : <Wifi size={12} className="text-gray-500 flex-shrink-0" />
                    }
                    <code className={`text-xs font-mono ${ip.suspicious ? 'text-red-300' : 'text-gray-400'}`}>{ip.ip}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${ip.suspicious ? 'text-red-400' : 'text-gray-300'}`}>{ip.count} scan{ip.count > 1 ? 's' : ''}</span>
                    {ip.suspicious && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">⚠ Burst</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pays 24h */}
        <Card>
          <CardHeader
            title="🗺️ Pays (24h)"
            subtitle={`${report.recentCountries.length} pays consulté(s)`}
          />
          {report.recentCountries.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucun scan dans les 24 dernières heures</p>
          ) : (
            <div className="space-y-2 mt-3">
              {report.recentCountries.map((c, i) => {
                const total24 = report.stats.last24h || 1;
                const pct = Math.round((c.count / total24) * 100);
                const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{c.country}</span>
                      <span className="font-mono text-gray-300">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
              {report.recentCountries.length > 3 && (
                <div className={`mt-2 p-2 rounded-lg text-xs ${report.recentCountries.length > 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {report.recentCountries.length > 3
                    ? `⚠️ ${report.recentCountries.length} pays différents en 24h — Vérification recommandée`
                    : `✅ Distribution géographique normale`
                  }
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Historique des scans récents ───────────────────────────── */}
      <Card>
        <CardHeader
          title="🕐 Derniers scans"
          subtitle="10 consultations les plus récentes"
        />
        {report.recentScans.length === 0 ? (
          <div className="text-center py-6">
            <Eye size={24} className="mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">Aucun scan enregistré pour ce lot</p>
          </div>
        ) : (
          <div className="mt-3 space-y-0 divide-y divide-white/[0.04]">
            {report.recentScans.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 py-2.5 ${s.isSuspicious ? 'bg-red-500/5' : ''}`}>
                <span className="text-base">{deviceIcon(s.device || '')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-200">
                      {s.city && s.city !== 'Inconnue' ? `${s.city}, ` : ''}{s.country || 'Inconnu'}
                    </p>
                    {s.isSuspicious && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
                        ⚠ Suspect
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{s.device || 'Inconnu'}</p>
                    {s.isSuspicious && s.suspicionReason && (
                      <p className="text-xs text-red-400 truncate">— {s.suspicionReason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                  <Clock size={11} />
                  <span>{formatDate(s.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Règles de détection ────────────────────────────────────── */}
      <Card>
        <CardHeader title="⚙️ Règles de détection actives" subtitle="Moteur anti-contrefaçon TraceAgro" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { icon: <Zap size={12} />,    label: 'Détection burst IP',           desc: '> 5 scans/heure depuis même IP → alerte',          active: true  },
            { icon: <Globe size={12} />,  label: 'Empreinte géographique',        desc: '> 3 pays différents en 24h → suspect',             active: true  },
            { icon: <Eye size={12} />,    label: 'Volume anormal',                desc: '> 20 scans en 1h → anomalie',                      active: true  },
            { icon: <Cpu size={12} />,    label: 'Identification device',         desc: 'Détection automatique iPhone / Android / PC',      active: true  },
            { icon: <Hash size={12} />,   label: 'Token HMAC SHA-256',            desc: 'Signature cryptographique unique par lot',         active: true  },
            { icon: <Lock size={12} />,   label: 'Marquage scan suspect',         desc: 'Flag isSuspicious en base de données',             active: true  },
            { icon: <Shield size={12} />, label: 'Score de confiance dynamique',  desc: '0–100, recalculé à chaque consultation',           active: true  },
            { icon: <Wifi size={12} />,   label: 'Masquage IP partiel',           desc: 'Affichage anonymisé des IPs (RGPD)',                active: true  },
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-white/[0.02] rounded-lg">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                {rule.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">{rule.label}</p>
                <p className="text-xs text-gray-500">{rule.desc}</p>
              </div>
              <CheckCircle size={12} className="text-emerald-400 ml-auto flex-shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
