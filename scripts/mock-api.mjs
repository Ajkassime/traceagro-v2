import http from 'http';

const MOCK_PRODUCERS = [
  {
    id: 'prod-1',
    name: 'Jean-Baptiste Rakoto',
    country: 'Madagascar',
    region: 'Sava',
    village: 'Sambava',
    latitude: -14.2667,
    longitude: 50.1667,
    areaHectares: 3.5,
    email: 'rakoto@vanille-sava.mg',
    telephone: '+261 34 01 234 56',
    isActive: true,
    certifications: [
      { id: 'c1', type: 'organic', issuer: 'Ecocert', issuedAt: '2025-01-15', expiresAt: '2026-01-15', status: 'valid' },
      { id: 'c2', type: 'fair_trade', issuer: 'Fairtrade Max Havelaar', issuedAt: '2025-02-01', expiresAt: '2026-02-01', status: 'valid' },
      { id: 'c3', type: 'eudr', issuer: 'Bureau Veritas', issuedAt: '2025-03-01', expiresAt: '2026-03-01', status: 'valid' },
    ],
    photos: [],
    _count: { lots: 8, certifications: 3 },
  },
  {
    id: 'prod-2',
    name: 'Marie-Helene Rasoa',
    country: 'Madagascar',
    region: 'Sava',
    village: 'Antalaha',
    latitude: -14.9000,
    longitude: 50.2833,
    areaHectares: 2.8,
    telephone: '+261 32 45 678 90',
    isActive: true,
    certifications: [
      { id: 'c4', type: 'organic', issuer: 'Ecocert', issuedAt: '2025-01-20', expiresAt: '2026-01-20', status: 'valid' },
      { id: 'c5', type: 'eudr', issuer: 'Bureau Veritas', issuedAt: '2025-02-15', expiresAt: '2026-02-15', status: 'valid' },
    ],
    photos: [],
    _count: { lots: 5, certifications: 2 },
  },
  {
    id: 'prod-3',
    name: 'Coopérative Sambava Élite',
    country: 'Madagascar',
    region: 'Sava',
    village: 'Vohemar',
    latitude: -13.3667,
    longitude: 50.0000,
    areaHectares: 12.0,
    email: 'contact@sambava-elite.mg',
    telephone: '+261 33 12 345 67',
    isActive: true,
    certifications: [
      { id: 'c6', type: 'eudr', issuer: 'Bureau Veritas', issuedAt: '2025-01-10', expiresAt: '2026-01-10', status: 'valid' },
    ],
    photos: [],
    _count: { lots: 14, certifications: 1 },
  }
];

const MOCK_LOTS = [
  {
    id: 'lot-1',
    lotNumber: 'LOT-2026-SAVA-001',
    producerId: 'prod-1',
    productId: 'prod-vanille-1',
    harvestDate: '2026-02-10T08:00:00.000Z',
    quantityKg: 450,
    status: 'processing',
    qualityScore: 9.2,
    notes: 'Récolte sélection manuelle de gousses vertes matures à Sambava',
    harvestLatitude: -14.2667,
    harvestLongitude: 50.1667,
    createdAt: '2026-02-11T09:00:00.000Z',
    producer: MOCK_PRODUCERS[0],
    product: { id: 'p1', name: 'Vanille Bourbon Gourmet', category: 'Épices', unit: 'kg' },
    processingSteps: [
      { id: 's1', lotId: 'lot-1', stepName: 'Réception & Pesée', stepOrder: 1, startedAt: '2026-02-11T10:00:00Z', endedAt: '2026-02-11T11:30:00Z', operatorName: 'Faly Andria', inputQuantity: 450, outputQuantity: 450, qualityScore: 9.5 },
      { id: 's2', lotId: 'lot-1', stepName: 'Échaudage (63°C)', stepOrder: 2, startedAt: '2026-02-12T07:00:00Z', endedAt: '2026-02-12T07:05:00Z', operatorName: 'Faly Andria', inputQuantity: 450, outputQuantity: 445, qualityScore: 9.4 },
      { id: 's3', lotId: 'lot-1', stepName: 'Étuvage traditionnel', stepOrder: 3, startedAt: '2026-02-12T08:00:00Z', endedAt: '2026-02-14T08:00:00Z', operatorName: 'Solo Raoelina', inputQuantity: 445, outputQuantity: 440, qualityScore: 9.1 },
      { id: 's4', lotId: 'lot-1', stepName: 'Séchage au soleil', stepOrder: 4, startedAt: '2026-02-15T08:00:00Z', operatorName: 'Solo Raoelina', inputQuantity: 440, qualityScore: 9.0 },
    ],
    documents: [
      { id: 'doc-1', title: 'Certificat Phytosanitaire Officiel', docType: 'phytosanitary', reference: 'CP-MAD-2026-0982', status: 'valid', verifiedAt: '2026-02-15T10:00:00Z' },
      { id: 'doc-2', title: 'Attestation Conformité EUDR Règlement 2023/1115', docType: 'eudr_proof', reference: 'EUDR-SAVA-4412', status: 'valid', verifiedAt: '2026-02-16T14:00:00Z' },
    ],
    shipmentLots: [
      { shipment: { id: 'ship-1', reference: 'EXP-2026-HAVRE-04', status: 'in_transit' } }
    ],
    _count: { processingSteps: 4, photos: 3 }
  },
  {
    id: 'lot-2',
    lotNumber: 'LOT-2026-SAVA-002',
    producerId: 'prod-2',
    productId: 'prod-vanille-2',
    harvestDate: '2026-02-14T08:00:00.000Z',
    quantityKg: 320,
    status: 'transit',
    qualityScore: 8.8,
    notes: 'Conditionnement sous-vide certifié export Le Havre',
    harvestLatitude: -14.9000,
    harvestLongitude: 50.2833,
    createdAt: '2026-02-15T09:00:00.000Z',
    producer: MOCK_PRODUCERS[1],
    product: { id: 'p2', name: 'Vanille Noire Non Fendue', category: 'Épices', unit: 'kg' },
    _count: { processingSteps: 7, photos: 2 }
  },
  {
    id: 'lot-3',
    lotNumber: 'LOT-2026-SAVA-003',
    producerId: 'prod-3',
    productId: 'prod-vanille-1',
    harvestDate: '2026-02-18T08:00:00.000Z',
    quantityKg: 680,
    status: 'processed',
    qualityScore: 8.5,
    notes: 'Lot affiné en malles de bois de rose',
    harvestLatitude: -13.3667,
    harvestLongitude: 50.0000,
    createdAt: '2026-02-19T09:00:00.000Z',
    producer: MOCK_PRODUCERS[2],
    product: { id: 'p1', name: 'Vanille Bourbon Gourmet', category: 'Épices', unit: 'kg' },
    _count: { processingSteps: 6, photos: 4 }
  }
];

const MOCK_SHIPMENTS = [
  {
    id: 'ship-1',
    reference: 'EXP-2026-HAVRE-04',
    carrierName: 'CMA CGM Madagascar',
    containerNumber: 'CMAU-882910-3',
    departureLocation: 'Port de Toamasina',
    arrivalLocation: 'Port du Havre (France)',
    departureDate: '2026-03-01T08:00:00.000Z',
    expectedArrival: '2026-03-24T18:00:00.000Z',
    status: 'in_transit',
    transportMode: 'maritime',
    notes: 'Conteneur ventilé sous température contrôlée 18°C',
    createdAt: '2026-02-25T10:00:00.000Z',
    shipmentLots: [
      { id: 'sl-1', lot: MOCK_LOTS[0] },
      { id: 'sl-2', lot: MOCK_LOTS[1] }
    ],
    documents: [
      { id: 'doc-s1', title: 'Connaissement Maritime B/L CMA-449', docType: 'invoice', reference: 'BL-9921', status: 'valid' },
      { id: 'doc-s2', title: 'Déclaration Due Diligence EUDR DDS-2026-004', docType: 'eudr_proof', reference: 'DDS-2026-004', status: 'valid' },
      { id: 'doc-s3', title: 'Certificat Phytosanitaire Export', docType: 'phytosanitary', reference: 'PHYTO-MG-2026-88', status: 'valid' }
    ],
    _count: { shipmentLots: 2, documents: 3 }
  },
  {
    id: 'ship-2',
    reference: 'EXP-2026-AIR-PARIS-02',
    carrierName: 'Air France Cargo',
    containerNumber: 'AWB-057-98214432',
    departureLocation: 'Antananarivo Ivato (TNR)',
    arrivalLocation: 'Paris Charles de Gaulle (CDG)',
    departureDate: '2026-03-10T12:00:00.000Z',
    expectedArrival: '2026-03-11T06:00:00.000Z',
    status: 'preparing',
    transportMode: 'aerien',
    notes: 'Expédition express vanille affinée extra',
    createdAt: '2026-03-02T10:00:00.000Z',
    shipmentLots: [
      { id: 'sl-3', lot: MOCK_LOTS[2] }
    ],
    documents: [],
    _count: { shipmentLots: 1, documents: 0 }
  }
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  let body = { success: true, data: [] };

  if (p === '/api/lots/dashboard-stats') {
    body = {
      success: true,
      data: {
        totalLots: 42,
        inProcessing: 12,
        inTransit: 6,
        exported: 24,
        totalWeightKg: 18450,
        avgQualityScore: 9.1
      }
    };
  } else if (p === '/api/conditioning') {
    body = {
      success: true,
      data: [],
      stats: { en_cours: 5, termine: 18, non_conforme: 1 }
    };
  } else if (p === '/api/intelligence/insights') {
    body = {
      success: true,
      data: [
        {
          id: 'ins-1',
          type: 'compliance',
          title: 'Conformité EUDR 100% sur le bassin Sava',
          description: 'Toutes les parcelles géolocalisées pour la campagne 2026 respectent le critère zéro déforestation.',
          severity: 'info',
          createdAt: '2026-03-01T08:00:00.000Z'
        },
        {
          id: 'ins-2',
          type: 'quality',
          title: 'Optimisation de la teneur en vanilline',
          description: 'Les lots affinés plus de 10 semaines dépassent 2.1% de vanilline pure, éligibles au grade Gourmet.',
          severity: 'success',
          createdAt: '2026-03-02T09:00:00.000Z'
        }
      ]
    };
  } else if (p === '/api/lots') {
    body = {
      success: true,
      data: MOCK_LOTS,
      pagination: { total: MOCK_LOTS.length, page: 1, limit: 20 }
    };
  } else if (p.startsWith('/api/lots/')) {
    body = { success: true, data: MOCK_LOTS[0] };
  } else if (p === '/api/shipments') {
    body = {
      success: true,
      data: MOCK_SHIPMENTS,
      pagination: { total: MOCK_SHIPMENTS.length, page: 1, limit: 50 }
    };
  } else if (p === '/api/shipments/stats') {
    body = {
      success: true,
      data: { total: 12, inTransit: 4, delivered: 7, preparing: 1 }
    };
  } else if (p.startsWith('/api/shipments/')) {
    body = { success: true, data: MOCK_SHIPMENTS[0] };
  } else if (p === '/api/producers') {
    body = {
      success: true,
      data: MOCK_PRODUCERS,
      pagination: { total: MOCK_PRODUCERS.length, page: 1, limit: 100 }
    };
  } else if (p.startsWith('/api/producers/')) {
    body = { success: true, data: MOCK_PRODUCERS[0] };
  } else if (p.includes('/public/lots/') || p.startsWith('/api/public/lots')) {
    body = { success: true, data: MOCK_LOTS[0] };
  } else if (p.includes('/public/shipments/') || p.startsWith('/api/public/shipments')) {
    body = { success: true, data: MOCK_SHIPMENTS[0] };
  } else if (p === '/api/products') {
    body = {
      success: true,
      data: [
        { id: 'p1', name: 'Vanille Bourbon Gourmet', category: 'Épices', unit: 'kg', isActive: true },
        { id: 'p2', name: 'Vanille Rouge Extra', category: 'Épices', unit: 'kg', isActive: true }
      ]
    };
  }

  res.writeHead(200);
  res.end(JSON.stringify(body));
});

server.listen(3000, () => {
  console.log('Mock API server listening on http://127.0.0.1:3000');
});
