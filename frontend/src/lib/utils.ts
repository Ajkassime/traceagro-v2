import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: fr });
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function formatKg(value: number) {
  return `${value.toLocaleString('fr-FR')} kg`;
}

export const LOT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  harvest:    { label: 'Récolte',       color: 'text-vanilla-500',  bg: 'bg-vanilla-500/10' },
  processing: { label: 'Transformation', color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  processed:  { label: 'Transformé',    color: 'text-purple-400',   bg: 'bg-purple-400/10' },
  transit:    { label: 'En transit',    color: 'text-orange-400',   bg: 'bg-orange-400/10' },
  exported:   { label: 'Exporté',       color: 'text-forest-500',   bg: 'bg-forest-500/10' },
  rejected:   { label: 'Rejeté',        color: 'text-red-400',      bg: 'bg-red-400/10' },
};

export const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  preparing:  { label: 'En préparation', color: 'text-vanilla-500', bg: 'bg-vanilla-500/10' },
  in_transit: { label: 'En transit',     color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  delivered:  { label: 'Livré',          color: 'text-forest-500',  bg: 'bg-forest-500/10' },
  cancelled:  { label: 'Annulé',         color: 'text-red-400',     bg: 'bg-red-400/10' },
};

export const CERT_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  organic:     { label: 'Bio',           emoji: '🌿' },
  fair_trade:  { label: 'Fair Trade',    emoji: '⚖️' },
  eudr:        { label: 'EUDR',          emoji: '🇪🇺' },
  rainforest:  { label: 'Rainforest',    emoji: '🌳' },
  other:       { label: 'Autre',         emoji: '📋' },
};

export const DOC_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  phytosanitary:   { label: 'Certificat Phytosanitaire', emoji: '🌱' },
  lab_report:      { label: 'Rapport de Laboratoire',    emoji: '🔬' },
  organic_cert:    { label: 'Certificat Bio',            emoji: '🌿' },
  fair_trade_cert: { label: 'Certificat Fair Trade',     emoji: '⚖️' },
  eudr_proof:      { label: 'Preuve EUDR',               emoji: '🇪🇺' },
  invoice:         { label: 'Facture',                   emoji: '🧾' },
  other:           { label: 'Autre',                     emoji: '📄' },
};

export function getQualityColor(score?: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 8) return 'text-forest-400';
  if (score >= 6) return 'text-vanilla-400';
  if (score >= 4) return 'text-orange-400';
  return 'text-red-400';
}
