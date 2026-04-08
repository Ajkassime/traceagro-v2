import { prisma } from '../../utils/prisma';

export class ProductsService {
  async getAll() {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { lots: true } } },
    });
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw { statusCode: 404, message: 'Produit introuvable' };
    return product;
  }

  async create(data: any) {
    return prisma.product.create({ data });
  }

  async update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  }

  async delete(id: string) {
    const lotsCount = await prisma.lot.count({ where: { productId: id } });
    if (lotsCount > 0) {
      throw { statusCode: 400, message: `Impossible de supprimer : ${lotsCount} lot(s) associé(s)` };
    }
    return prisma.product.delete({ where: { id } });
  }
}

export const productsService = new ProductsService();
