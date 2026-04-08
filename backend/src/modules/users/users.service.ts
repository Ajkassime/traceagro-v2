import { prisma } from '../../utils/prisma';

export class UsersService {
  async getAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
    return user;
  }

  async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw { statusCode: 404, message: 'Utilisateur introuvable' };
    return prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const usersService = new UsersService();
