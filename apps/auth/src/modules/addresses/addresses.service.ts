import { prisma } from '../../db/prisma.client.js';
import type { CreateAddressInput } from './addresses.schemas.js';

export const addressesService = {
  list(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  },

  create(userId: string, input: CreateAddressInput) {
    return prisma.address.create({
      data: {
        userId,
        label: input.label ?? null,
        line1: input.line1,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country
      }
    });
  },

  /** Deletes an address only if it belongs to the user. Returns whether it existed. */
  async delete(userId: string, id: string) {
    const result = await prisma.address.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
};
