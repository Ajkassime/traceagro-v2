import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy') {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: fr });
}

export function formatRelative(date: string | Date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function formatKg(value: number) {
  return `${(value ?? 0).toLocaleString('fr-FR')} kg`;
}

// Charte « Terre & Registre » :
// Vérifié: texte #435432, fond #E5ECD9
// À contrôler: texte #795015, fond #F5E8CC
// Erreur: texte #963C47, fond #F8E6E8
// En cours: texte #352638, fond #EAE2EB
export const LOT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; symbol: string }> = {
  harvest:    { label: 'Récolte',        color: 'text-[#795015]', bg: 'bg-[#F5E8CC]', symbol: '●' },
  processing: { label: 'Transformation', color: 'text-[#352638]', bg: 'bg-[#EAE2EB]', symbol: '◐' },
  processed:  { label: 'Transformé',     color: 'text-[#352638]', bg: 'bg-[#EAE2EB]', symbol: '◑' },
  transit:    { label: 'En transit',     color: 'text-[#795015]', bg: 'bg-[#F5E8CC]', symbol: '➔' },
  exported:   { label: 'Exporté',        color: 'text-[#435432]', bg: 'bg-[#E5ECD9]', symbol: '✓' },
  rejected:   { label: 'Rejeté',         color: 'text-[#963C47]', bg: 'bg-[#F8E6E8]', symbol: '✕' },
};

export const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; symbol: string }> = {
  preparing:  { label: 'En préparation', color: 'text-[#795015]', bg: 'bg-[#F5E8CC]', symbol: '●' },
  in_transit: { label: 'En transit',     color: 'text-[#352638]', bg: 'bg-[#EAE2EB]', symbol: '➔' },
  delivered:  { label: 'Livré',          color: 'text-[#435432]', bg: 'bg-[#E5ECD9]', symbol: '✓' },
  cancelled:  { label: 'Annulé',         color: 'text-[#963C47]', bg: 'bg-[#F8E6E8]', symbol: '✕' },
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
  if (!score) return 'text-[#70656B]';
  if (score >= 8) return 'text-[#435432]';
  if (score >= 6) return 'text-[#795015]';
  return 'text-[#963C47]';
}
