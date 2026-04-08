import { prisma } from './prisma';

export async function generateLotNumber(productCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LOT-${year}-${productCode.toUpperCase().substring(0, 3)}`;

  const lastLot = await prisma.lot.findFirst({
    where: { lotNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
  });

  let sequence = 1;
  if (lastLot) {
    const parts = lastLot.lotNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}
