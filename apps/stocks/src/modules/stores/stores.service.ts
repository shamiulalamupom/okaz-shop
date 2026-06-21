import { prisma } from '../../db/prisma.client.js';
import type { CreateStoreInput, UpdateStoreInput } from './stores.schemas.js';

export const storesService = {
  async list() {
    return prisma.store.findMany({ orderBy: { name: 'asc' } });
  },

  async getById(id: string) {
    return prisma.store.findUnique({ where: { id } });
  },

  async create(input: CreateStoreInput) {
    return prisma.store.create({
      data: {
        name: input.name,
        city: input.city ?? null
      }
    });
  },

  /** Updates a store's name/city. Returns null if the store does not exist. */
  async update(id: string, input: UpdateStoreInput) {
    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    return prisma.store.update({
      where: { id },
      data: {
        name: input.name,
        city: input.city && input.city.length > 0 ? input.city : null
      }
    });
  }
};
