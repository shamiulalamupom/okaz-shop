import { prisma } from '../../db/prisma.client.js';

export const internalService = {
  /** Returns the ids of every active staff member (STORE_MANAGER or ADMIN). */
  async listStaff() {
    const staff = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { hasSome: ['STORE_MANAGER', 'ADMIN'] }
      },
      select: { id: true, email: true, roles: true }
    });

    return staff;
  }
};
