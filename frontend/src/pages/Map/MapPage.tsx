import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, CircleMarker, Popup, Polyline,
  useMap, LayersControl, ZoomControl,
} from 'react-leaflet';
import {
  Layers, Activity, Shield, Zap, BarChart2, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Eye, Package,
  Truck, Globe, Filter, RefreshCw, Maximize2,
} from 'lucide-react';
import L from 'leaflet';
import api from '../../lib/api';
import 'leaflet/dist/leaflet.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProducerMapData {
  id: string; name: string; region: string; country: string;
  latitude: number; longitude: number; areaHectares?: number;
  compositeScore: number; eudrRisk: 'low' | 'medium' | 'high';
  activeCertifications: number; totalScans: number; lotCount: number;
  avgQualityScore?: number;
  recentLots: { id: string; lotNumber: string; status: string; quantityKg: number; productName?: string }[];
}
interface ScanLogMapData {
  id: string; country?: string; city?: string; device?: string;
  latitude: number; longitude: number; createdAt: string; isSuspicious: boolean;
  lot?: { id: string; lotNumber: string; producerId: string };
}
interface ShipmentMapData {
  id: string; reference: string; status: string;
  departureLocation: string; arrivalLocation: string;
  totalWeightKg?: number; carrierName: string;
  shipmentLots: {
    lot: {
      id: string; lotNumber: string; quantityKg: number;
      producer: { id: string; name: string; latitude?: number; longitude?: number; region: string };
      product?: { name: string };
    };
  }[];
}
interface MapStats {
  totalProducers: number; totalShipments: number;
  totalScansLast30d: number; eudrHighRisk: number; avgScore: number;
}

// ─── Destination coordinates for known cities/countries ───────────────────────
const DESTINATION_COORDS: Record<string, [number, number]> = {
  'France': [46.2, 2.2], 'Paris': [48.85, 2.35], 'Marseille': [43.3, 5.37],
  'Germany': [51.2, 10.5], 'Hamburg': [53.55, 10.0], 'Berlin': [52.52, 13.4],
  'Italy': [42.5, 12.5], 'Spain': [40.4, -3.7], 'Netherlands': [52.1, 5.3],
  'Rotterdam': [51.9, 4.5], 'Belgium': [50.5, 4.5], 'UK': [52.4, -1.9],
  'London': [51.5, -0.12], 'USA': [37.1, -95.7], 'Japan': [36.2, 138.3],
  'China': [35.8, 104.2], 'Dubai': [25.2, 55.3], 'Singapore': [1.35, 103.82],
  'Antananarivo': [-18.91, 47.54], 'Toamasina': [-18.15, 49.4],
  'Mahajanga': [-15.72, 46.32], 'Fianarantsoa': [-21.45, 47.09],
};

function resolveCoords(location: string): [number, number] | null {
  for (const [key, coords] of Object.entries(DESTINATION_COORDS)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return coords;
  }
  return null;
}

// ─── Score color ──────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}
function eudrColor(risk: string): string {
  if (risk === 'low') return '#22c55e';
  if (risk === 'medium') return '#f59e0b';
  return '#ef4444';
}

// ─── Animated polyline component ──────────────────────────────────────────────
interface FlowLineProps {
  from: [number, number]; to: [number, number];
  weight: number; color: string; label: string;
  onClick: () => void;
}
const FlowLine: React.FC<FlowLineProps> = ({ from, to, weight, color, label, onClick }) => {
  const midLat = (from[0] + to[0]) / 2 + (Math.random() * 4 - 2);
  const midLng = (from[1] + to[1]) / 2;
  const positions: [number, number][] = [from, [midLat, midLng], to];
  return (
    <Polyline
      positions={positions}
      pathOptions={{ color, weight: Math.max(1, Math.min(weight, 8)), opacity: 0.7, dashArray: '8 4' }}
      eventHandlers={{ click: onClick }}
    >
      <Popup><div className="text-sm font-semibold">{label}</div></Popup>
    </Polyline>
  );
};

// ─── Fit bounds helper ────────────────────────────────────────────────────────
const FitBounds: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }, [coords.length]);
  return null;
};

// ─── Main MapPage ─────────────────────────────────────────────────────────────
export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<'producers' | 'scans' | 'shipments' | 'eudr' | 'chrono'>('producers');
  const [tileStyle, setTileStyle] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  const [selectedProducer, setSelectedProducer] = useState<ProducerMapData | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentMapData | null>(null);
  const [chronoMonth, setChronoMonth] = useState<number>(0); // 0 = all
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showPanel, setShowPanel] = useState(true);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['map-data'],
    queryFn: () => api.get('/producers/map-data').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const producers: ProducerMapData[] = data?.producers ?? [];
  const scanLogs: ScanLogMapData[] = data?.scanLogs ?? [];
  const shipments: ShipmentMapData[] = data?.shipments ?? [];
  const stats: MapStats = data?.stats ?? { totalProducers: 0, totalShipments: 0, totalScansLast30d: 0, eudrHighRisk: 0, avgScore: 0 };

  // ── Filter producers ────────────────────────────────────────────────────────
  const filteredProducers = producers.filter((p) => {
    if (filterRisk !== 'all' && p.eudrRisk !== filterRisk) return false;
    if (activeLayer === 'chrono' && chronoMonth > 0) return true; // chronoMap shows all
    return true;
  });

  // ── Tile URLs ───────────────────────────────────────────────────────────────
  const tileUrls: Record<string, { url: string; attribution: string }> = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri World Imagery',
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap',
    },
  };

  // ── Shipment flow lines ─────────────────────────────────────────────────────
  const shipmentFlows = shipments.flatMap((s) => {
    const dest = resolveCoords(s.arrivalLocation);
    if (!dest) return [];
    return s.shipmentLots
      .filter((sl) => sl.lot.producer.latitude && sl.lot.producer.longitude)
      .map((sl) => ({
        shipment: s,
        from: [sl.lot.producer.latitude!, sl.lot.producer.longitude!] as [number, number],
        to: dest,
        weight: Math.max(1, Math.round((sl.lot.quantityKg ?? 100) / 500)),
        label: `${s.reference} · ${sl.lot.producer.name} → ${s.arrivalLocation}`,
      }));
  });

  // ── Chrono: last N months ───────────────────────────────────────────────────
  const MONTHS = ['Tout', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  // ── All producer coords for fitBounds ────────────────────────────────────────
  const allCoords: [number, number][] = producers.map((p) => [p.latitude, p.longitude]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-emerald-400" />
          <span className="font-bold text-white text-lg">TraceAgro · Cartographie</span>
          <span className="text-xs text-gray-400 ml-2">Intelligence géographique temps réel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors" title="Rafraîchir">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowPanel((v) => !v)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors" title="Panneau">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left panel ── */}
        {showPanel && (
          <div className="flex-none w-72 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto z-10">
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-800">
              <StatBadge icon={<Package size={13} />} label="Producteurs" value={stats.totalProducers} color="emerald" />
              <StatBadge icon={<Truck size={13} />} label="Expéditions" value={stats.totalShipments} color="blue" />
              <StatBadge icon={<Eye size={13} />} label="Scans 30j" value={stats.totalScansLast30d} color="purple" />
              <StatBadge icon={<AlertTriangle size={13} />} label="EUDR Risque" value={stats.eudrHighRisk} color="red" />
            </div>

            {/* Layer selector */}
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Layers size={12} /> Couches</p>
              <div className="space-y-1">
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLayer(l.id as any)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeLayer === l.id
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span>{l.icon}</span>
                    <span className="flex-1 text-left">{l.label}</span>
                    {activeLayer === l.id && <ChevronRight size={13} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile selector */}
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fond de carte</p>
              <div className="flex gap-1">
                {(['osm', 'satellite', 'terrain'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTileStyle(t)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                      tileStyle === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {t === 'osm' ? '🗺️ OSM' : t === 'satellite' ? '🛰️ Sat' : '⛰️ Terrain'}
                  </button>
                ))}
              </div>
            </div>

            {/* EUDR filter */}
            {(activeLayer === 'producers' || activeLayer === 'eudr') && (
              <div className="p-3 border-b border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Filter size={12} /> Filtre EUDR</p>
                <div className="flex gap-1">
                  {(['all', 'low', 'medium', 'high'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFilterRisk(r)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                        filterRisk === r
                          ? r === 'all' ? 'bg-gray-600 text-white'
                            : r === 'low' ? 'bg-green-600 text-white'
                            : r === 'medium' ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {r === 'all' ? 'Tous' : r === 'low' ? '✅' : r === 'medium' ? '⚠️' : '🔴'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chrono slider */}
            {activeLayer === 'chrono' && (
              <div className="p-3 border-b border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Activity size={12} /> Timeline</p>
                <input
                  type="range" min={0} max={12} value={chronoMonth}
                  onChange={(e) => setChronoMonth(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p className="text-center text-sm font-semibold text-emerald-400 mt-1">{MONTHS[chronoMonth]}</p>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Tout</span><span>Déc</span>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Légende</p>
              {activeLayer === 'producers' || activeLayer === 'eudr' || activeLayer === 'chrono' ? (
                <div className="space-y-1">
                  <LegendItem color="#22c55e" label="Score ≥ 75 · EUDR Conforme" />
                  <LegendItem color="#f59e0b" label="Score 50-74 · Risque modéré" />
                  <LegendItem color="#ef4444" label="Score < 50 · Risque élevé" />
                  <LegendItem color="#6366f1" size="sm" label="Taille = nb de lots" />
                </div>
              ) : activeLayer === 'scans' ? (
                <div className="space-y-1">
                  <LegendItem color="#8b5cf6" label="Scan normal" />
                  <LegendItem color="#ef4444" label="Scan suspect (fraude)" />
                  <p className="text-xs text-gray-500 mt-1">Rayon ∝ densité de scans</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <LegendItem color="#3b82f6" label="Expédition en transit" />
                  <LegendItem color="#22c55e" label="Expédition livrée" />
                  <LegendItem color="#f59e0b" label="En préparation" />
                  <p className="text-xs text-gray-500 mt-1">Épaisseur ∝ tonnage</p>
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selectedProducer && (
              <ProducerDetailPanel
                producer={selectedProducer}
                onClose={() => setSelectedProducer(null)}
                onNavigate={() => navigate(`/producers/${selectedProducer.id}`)}
              />
            )}
            {selectedShipment && !selectedProducer && (
              <ShipmentDetailPanel
                shipment={selectedShipment}
                onClose={() => setSelectedShipment(null)}
                onNavigate={() => navigate(`/shipments/${selectedShipment.id}`)}
              />
            )}
          </div>
        )}

        {/* ── Map ── */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-emerald-400 text-sm font-medium">Chargement des données géographiques…</p>
              </div>
            </div>
          )}

          <MapContainer
            center={[-18.9, 47.5]}
            zoom={6}
            zoomControl={false}
            style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
          >
            <ZoomControl position="bottomright" />
            <TileLayer url={tileUrls[tileStyle].url} attribution={tileUrls[tileStyle].attribution} />
            {allCoords.length > 0 && <FitBounds coords={allCoords} />}

            {/* ── LAYER 1: Producers / EUDR / Chrono ── */}
            {(activeLayer === 'producers' || activeLayer === 'eudr' || activeLayer === 'chrono') &&
              filteredProducers.map((p) => {
                const color = activeLayer === 'eudr' ? eudrColor(p.eudrRisk) : scoreColor(p.compositeScore);
                const radius = 8 + Math.min(p.lotCount * 2, 18);
                // Chrono: pulse effect based on chronoMonth (visual only)
                const opacity = activeLayer === 'chrono' && chronoMonth > 0 ? 0.9 : 0.8;
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.latitude, p.longitude]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: opacity, weight: 2 }}
                    eventHandlers={{ click: () => { setSelectedProducer(p); setSelectedShipment(null); } }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.region} · {p.country}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-semibold" style={{ color }}>Score {p.compositeScore}/100</span>
                        </div>
                        <div className="flex gap-2 mt-1 text-xs text-gray-600">
                          <span>📦 {p.lotCount} lots</span>
                          <span>🔍 {p.totalScans} scans</span>
                        </div>
                        <div className="mt-1 text-xs">
                          EUDR : <span className="font-semibold" style={{ color: eudrColor(p.eudrRisk) }}>
                            {p.eudrRisk === 'low' ? '✅ Conforme' : p.eudrRisk === 'medium' ? '⚠️ Modéré' : '🔴 Risque'}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* ── LAYER 2: ScanHeatmap ── */}
            {activeLayer === 'scans' &&
              scanLogs.map((s) => (
                <CircleMarker
                  key={s.id}
                  center={[s.latitude, s.longitude]}
                  radius={s.isSuspicious ? 10 : 6}
                  pathOptions={{
                    color: s.isSuspicious ? '#ef4444' : '#8b5cf6',
                    fillColor: s.isSuspicious ? '#ef4444' : '#a78bfa',
                    fillOpacity: 0.65,
                    weight: s.isSuspicious ? 2 : 1,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{s.city ?? 'Ville inconnue'}, {s.country ?? '?'}</p>
                      <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs">📱 {s.device ?? 'Appareil inconnu'}</p>
                      {s.isSuspicious && <p className="text-xs text-red-600 font-bold mt-1">⚠️ Scan suspect</p>}
                      {s.lot && <p className="text-xs text-gray-600">Lot : {s.lot.lotNumber}</p>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* ── LAYER 3: Shipment Flows ── */}
            {activeLayer === 'shipments' &&
              shipmentFlows.map((f, i) => {
                const color = f.shipment.status === 'delivered' ? '#22c55e'
                  : f.shipment.status === 'transit' ? '#3b82f6'
                  : '#f59e0b';
                return (
                  <React.Fragment key={`flow-${i}`}>
                    <FlowLine
                      from={f.from} to={f.to}
                      weight={f.weight} color={color} label={f.label}
                      onClick={() => { setSelectedShipment(f.shipment); setSelectedProducer(null); }}
                    />
                    {/* Origin dot */}
                    <CircleMarker
                      center={f.from} radius={6}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.9, weight: 2 }}
                    >
                      <Popup><div className="text-xs font-bold">{f.shipment.shipmentLots[0]?.lot.producer.name}</div></Popup>
                    </CircleMarker>
                    {/* Destination dot */}
                    <CircleMarker
                      center={f.to} radius={8}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">{f.shipment.arrivalLocation}</p>
                          <p className="text-xs">{f.shipment.reference}</p>
                          <p className="text-xs capitalize">{f.shipment.status}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </React.Fragment>
                );
              })}

            {/* ── LAYER 3b: Producers on shipments layer too ── */}
            {activeLayer === 'shipments' &&
              producers.map((p) => (
                <CircleMarker
                  key={`base-${p.id}`}
                  center={[p.latitude, p.longitude]}
                  radius={5}
                  pathOptions={{ color: '#6ee7b7', fillColor: '#6ee7b7', fillOpacity: 0.5, weight: 1 }}
                  eventHandlers={{ click: () => setSelectedProducer(p) }}
                />
              ))}
          </MapContainer>

          {/* ── Floating layer badge ── */}
          <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
            <div className="bg-gray-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-700 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                {LAYERS.find((l) => l.id === activeLayer)?.icon}
                <span>{LAYERS.find((l) => l.id === activeLayer)?.label}</span>
              </div>
              {activeLayer === 'scans' && (
                <p className="text-xs text-purple-400 mt-0.5">{scanLogs.length} scans · 30 derniers jours</p>
              )}
              {activeLayer === 'shipments' && (
                <p className="text-xs text-blue-400 mt-0.5">{shipmentFlows.length} flux actifs</p>
              )}
              {activeLayer === 'producers' && (
                <p className="text-xs text-emerald-400 mt-0.5">Score moyen : {stats.avgScore}/100</p>
              )}
              {activeLayer === 'eudr' && (
                <p className="text-xs text-red-400 mt-0.5">{stats.eudrHighRisk} producteur(s) à risque</p>
              )}
              {activeLayer === 'chrono' && (
                <p className="text-xs text-yellow-400 mt-0.5">Période : {MONTHS[chronoMonth]}</p>
              )}
            </div>
          </div>

          {/* ── Bottom stats bar ── */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="flex gap-2 bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 shadow-xl">
              <MiniStat label="Producteurs" value={stats.totalProducers} />
              <div className="w-px bg-gray-700" />
              <MiniStat label="Expéditions" value={stats.totalShipments} />
              <div className="w-px bg-gray-700" />
              <MiniStat label="Scans QR" value={stats.totalScansLast30d} />
              <div className="w-px bg-gray-700" />
              <MiniStat label="Score moy." value={`${stats.avgScore}/100`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Layer definitions ─────────────────────────────────────────────────────────
const LAYERS = [
  { id: 'producers', label: 'Producteurs & Scores',   icon: <Package size={14} /> },
  { id: 'scans',     label: 'ScanHeatmap Mondiale',   icon: <Zap size={14} /> },
  { id: 'shipments', label: 'Flux Supply Chain',      icon: <Truck size={14} /> },
  { id: 'eudr',      label: 'EUDR Risk Overlay',      icon: <Shield size={14} /> },
  { id: 'chrono',    label: 'Chrono Map',             icon: <Activity size={14} /> },
];

// ─── Small components ─────────────────────────────────────────────────────────
const StatBadge: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`bg-gray-800 rounded-lg p-2 flex flex-col gap-1`}>
    <div className={`flex items-center gap-1 text-${color}-400 text-xs`}>{icon}{label}</div>
    <span className="text-white font-bold text-lg leading-none">{value}</span>
  </div>
);

const LegendItem: React.FC<{ color: string; label: string; size?: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: color }} />
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

const MiniStat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="text-center px-1">
    <div className="text-white font-bold text-sm">{value}</div>
    <div className="text-gray-500 text-xs">{label}</div>
  </div>
);

const ProducerDetailPanel: React.FC<{ producer: ProducerMapData; onClose: () => void; onNavigate: () => void }> = ({ producer, onClose, onNavigate }) => (
  <div className="p-3 bg-gray-800/60 m-2 rounded-xl border border-gray-700">
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="font-bold text-white text-sm">{producer.name}</p>
        <p className="text-xs text-gray-400">{producer.region}</p>
      </div>
      <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
    </div>
    {/* Score gauge */}
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Score composite</span>
        <span className="font-bold" style={{ color: scoreColor(producer.compositeScore) }}>{producer.compositeScore}/100</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${producer.compositeScore}%`, backgroundColor: scoreColor(producer.compositeScore) }} />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 mb-2 text-center">
      <div className="bg-gray-900 rounded p-1"><p className="text-white font-bold text-sm">{producer.lotCount}</p><p className="text-gray-500 text-xs">Lots</p></div>
      <div className="bg-gray-900 rounded p-1"><p className="text-white font-bold text-sm">{producer.activeCertifications}</p><p className="text-gray-500 text-xs">Certs</p></div>
      <div className="bg-gray-900 rounded p-1"><p className="text-white font-bold text-sm">{producer.totalScans}</p><p className="text-gray-500 text-xs">Scans</p></div>
    </div>
    <div className="flex items-center gap-1 mb-3">
      <span className="text-xs text-gray-400">EUDR :</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: eudrColor(producer.eudrRisk) + '33', color: eudrColor(producer.eudrRisk) }}>
        {producer.eudrRisk === 'low' ? '✅ Conforme' : producer.eudrRisk === 'medium' ? '⚠️ Modéré' : '🔴 Risque élevé'}
      </span>
    </div>
    {producer.recentLots.length > 0 && (
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Derniers lots</p>
        {producer.recentLots.map((l) => (
          <div key={l.id} className="flex justify-between text-xs py-0.5">
            <span className="text-gray-300">{l.lotNumber}</span>
            <span className="text-gray-500">{l.quantityKg} kg</span>
          </div>
        ))}
      </div>
    )}
    <button onClick={onNavigate} className="w-full text-xs py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1">
      Voir le profil <ChevronRight size={12} />
    </button>
  </div>
);

const ShipmentDetailPanel: React.FC<{ shipment: ShipmentMapData; onClose: () => void; onNavigate: () => void }> = ({ shipment, onClose, onNavigate }) => {
  const statusColor = shipment.status === 'delivered' ? '#22c55e' : shipment.status === 'transit' ? '#3b82f6' : '#f59e0b';
  return (
    <div className="p-3 bg-gray-800/60 m-2 rounded-xl border border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-white text-sm">{shipment.reference}</p>
          <p className="text-xs" style={{ color: statusColor }}>{shipment.status}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="text-xs text-gray-400 space-y-1 mb-2">
        <p>🚢 {shipment.carrierName}</p>
        <p>📍 {shipment.departureLocation} → {shipment.arrivalLocation}</p>
        {shipment.totalWeightKg && <p>⚖️ {shipment.totalWeightKg} kg</p>}
      </div>
      <p className="text-xs text-gray-500 mb-1">{shipment.shipmentLots.length} lot(s)</p>
      <button onClick={onNavigate} className="w-full text-xs py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1">
        Voir l'expédition <ChevronRight size={12} />
      </button>
    </div>
  );
};
