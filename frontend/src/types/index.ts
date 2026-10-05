// ─── AUTH ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'field_agent' | 'quality_manager' | 'viewer';
  avatarUrl?: string;
}

// ─── PRODUCT ─────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  variety?: string;
  category: string;
  unit: string;
  isActive: boolean;
  _count?: { lots: number };
}

// ─── PRODUCER ────────────────────────────────────────────────────────
export interface Producer {
  id: string;
  name: string;
  country: string;
  region: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  areaHectares?: number;
  email?: string;
  telephone?: string;
  isActive: boolean;
  certifications?: Certification[];
  photos?: ProducerPhoto[];
  lots?: Lot[];
  _count?: { lots: number; certifications: number };
}

// ─── CERTIFICATION ───────────────────────────────────────────────────
export interface Certification {
  id: string;
  producerId: string;
  type: 'organic' | 'fair_trade' | 'eudr' | 'rainforest' | 'other';
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: string;
  fileUrl?: string;
  producer?: { name: string };
}

// ─── LOT ──────────────────────────────────────────────────────────────
export type LotStatus = 'harvest' | 'processing' | 'processed' | 'transit' | 'exported' | 'rejected';

export interface ProcessingStep {
  id: string;
  lotId: string;
  stepName: string;
  stepOrder: number;
  startedAt: string;
  endedAt?: string;
  operatorName?: string;
  location?: string;
  inputQuantity?: number;
  outputQuantity?: number;
  qualityScore?: number;
  notes?: string;
  photos?: { url: string; caption?: string }[];
}

export interface Lot {
  id: string;
  lotNumber: string;
  producerId: string;
  productId: string;
  harvestDate: string;
  quantityKg: number;
  status: LotStatus;
  qrCodeUrl?: string;
  qualityScore?: number;
  notes?: string;
  harvestLatitude?: number;
  harvestLongitude?: number;
  createdAt: string;
  producer?: { id: string; name: string; region: string; country: string };
  product?: { id: string; name: string; category: string; unit: string };
  processingSteps?: ProcessingStep[];
  photos?: { url: string; caption?: string }[];
  documents?: Document[];
  shipmentLots?: { shipment: { id: string; reference: string; status: string } }[];
  _count?: { processingSteps: number; photos: number };
}

// ─── SHIPMENT ────────────────────────────────────────────────────────
export type ShipmentStatus = 'preparing' | 'in_transit' | 'delivered' | 'cancelled';

export interface Shipment {
  id: string;
  reference: string;
  carrierName: string;
  containerNumber?: string;
  depot?: string;
  departureLocation: string;
  arrivalLocation: string;
  departureDate?: string;
  expectedArrival?: string;
  actualArrival?: string;
  status: ShipmentStatus;
  notes?: string;
  shipmentLots?: { lot: Lot }[];
  _count?: { shipmentLots: number };
}

// ─── DOCUMENT ────────────────────────────────────────────────────────
export interface Document {
  id: string;
  name: string;
  docType: 'phytosanitary' | 'lab_report' | 'organic_cert' | 'fair_trade_cert' | 'eudr_proof' | 'invoice' | 'other';
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  lotId?: string;
  producerId?: string;
  shipmentId?: string;
  notes?: string;
  createdAt: string;
}

// ─── PHOTOS ──────────────────────────────────────────────────────────
export interface ProducerPhoto { id: string; url: string; caption?: string; isPrimary: boolean; }

// ─── INTELLIGENCE ────────────────────────────────────────────────────
export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  category: string;
  title: string;
  message: string;
  value?: string | number;
  entityId?: string;
  entityType?: string;
  priority: number;
}

export interface Anomaly {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  lotId?: string;
  lotNumber?: string;
  producerId?: string;
  producerName?: string;
  description: string;
  detectedAt: string;
}

export interface TrendPoint {
  month: string;
  total: number;
  exported: number;
  avgQuality: number;
}

export interface ProducerRanking {
  id: string;
  name: string;
  region: string;
  score: number;
  avgQuality: number;
  totalLots: number;
  activeCertifications: number;
}

// ─── NOTIFICATION ────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── API RESPONSE ────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; message: string; data: T; }
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}
