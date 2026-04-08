import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateQRCode } from '../utils/qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding...');

  // Admin user
  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@traceagro.mg' },
    update: {},
    create: { email: 'admin@traceagro.mg', passwordHash, firstName: 'Admin', lastName: 'TraceAgro', role: 'admin' },
  });

  await prisma.user.upsert({
    where: { email: 'agent@traceagro.mg' },
    update: {},
    create: { email: 'agent@traceagro.mg', passwordHash: await bcrypt.hash('Agent1234!', 12), firstName: 'Jean', lastName: 'Rakoto', role: 'field_agent' },
  });

  // Products
  const vanilla = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Vanille Bourbon', variety: 'Planifolia', category: 'VAN', unit: 'kg' },
  });
  const coffee = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000002', name: 'Café Arabica', variety: 'Arabica', category: 'CAF', unit: 'kg' },
  });

  // Producers
  const producer1 = await prisma.producer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Coopérative Sambava Nord',
      region: 'SAVA',
      village: 'Sambava',
      latitude: -14.2667,
      longitude: 50.1667,
      areaHectares: 45.5,
      telephone: '+261 32 11 111 11',
    },
  });

  const producer2 = await prisma.producer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Famille Ratsimba',
      region: 'Analanjirofo',
      village: 'Fénérive Est',
      latitude: -17.3667,
      longitude: 49.4167,
      areaHectares: 12.0,
    },
  });

  // Certifications
  await prisma.certification.createMany({
    skipDuplicates: true,
    data: [
      { producerId: producer1.id, type: 'organic', issuer: 'Ecocert', issuedAt: new Date('2024-01-01'), expiresAt: new Date('2026-12-31'), status: 'active' },
      { producerId: producer1.id, type: 'eudr', issuer: 'Bureau Veritas', issuedAt: new Date('2025-01-01'), expiresAt: new Date('2026-06-30'), status: 'active' },
      { producerId: producer2.id, type: 'fair_trade', issuer: 'Fairtrade Int.', issuedAt: new Date('2024-06-01'), expiresAt: new Date('2026-05-31'), status: 'active' },
    ],
  });

  // Sample lot
  const sampleLotId = '10000000-0000-0000-0000-000000000001';
  const sampleLotQr = await generateQRCode(`http://localhost:5173/lot-public/${sampleLotId}`);

  await prisma.lot.upsert({
    where: { lotNumber: 'LOT-2026-VAN-0001' },
    update: {
      qrCodeUrl: sampleLotQr,
    },
    create: {
      id: sampleLotId,
      lotNumber: 'LOT-2026-VAN-0001',
      producerId: producer1.id,
      productId: vanilla.id,
      harvestDate: new Date('2026-01-15'),
      quantityKg: 250,
      status: 'processing',
      qualityScore: 8.5,
      harvestLatitude: -14.27,
      harvestLongitude: 50.17,
      qrCodeUrl: sampleLotQr,
    },
  });

  console.log('✅ Seeding terminé !');
  console.log('📧 Admin: admin@traceagro.mg / Admin1234!');
  console.log('📧 Agent: agent@traceagro.mg / Agent1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
