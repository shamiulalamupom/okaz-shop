import { prisma } from '../../db/prisma.client.js';
import type { CreateStoreInput } from './stores.schemas.js';

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
  }
};
