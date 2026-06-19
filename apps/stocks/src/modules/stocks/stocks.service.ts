import { prisma } from '../../db/prisma.client.js';
import type { AdjustStockInput, ReservationItem, UpsertStockInput } from './stocks.schemas.js';

export type InsufficientStockDetail = {
  productId: string;
  storeId: string;
  requested: number;
  available: number;
};

export class InsufficientStockError extends Error {
  constructor(public readonly shortages: InsufficientStockDetail[]) {
    super('Insufficient stock for one or more items');
    this.name = 'InsufficientStockError';
  }
}

export const stocksService = {
  async list(filter: { productId?: string; storeId?: string }) {
    return prisma.stock.findMany({
      where: {
        ...(filter.productId ? { productId: filter.productId } : {}),
        ...(filter.storeId ? { storeId: filter.storeId } : {})
      },
      orderBy: [{ productId: 'asc' }, { storeId: 'asc' }]
    });
  },

  async getByProduct(productId: string) {
    const stocks = await prisma.stock.findMany({
      where: { productId },
      orderBy: { storeId: 'asc' }
    });

    const total = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

    return { productId, total, stocks };
  },

  /** Sets the absolute quantity for a product in a store (create or update). */
  async upsert(input: UpsertStockInput) {
    return prisma.stock.upsert({
      where: { productId_storeId: { productId: input.productId, storeId: input.storeId } },
      update: { quantity: input.quantity },
      create: { productId: input.productId, storeId: input.storeId, quantity: input.quantity }
    });
  },

  /** Adjusts the quantity by a signed delta (e.g. restock +10). Clamps at 0. */
  async adjust(input: AdjustStockInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.stock.findUnique({
        where: { productId_storeId: { productId: input.productId, storeId: input.storeId } }
      });

      const current = existing?.quantity ?? 0;
      const next = Math.max(0, current + input.delta);

      return tx.stock.upsert({
        where: { productId_storeId: { productId: input.productId, storeId: input.storeId } },
        update: { quantity: next },
        create: { productId: input.productId, storeId: input.storeId, quantity: next }
      });
    });
  },

  /**
   * Atomically reserves (decrements) stock for all items.
   * Either every item has sufficient stock and all are decremented, or nothing changes.
   */
  async reserve(items: ReservationItem[]) {
    return prisma.$transaction(async (tx) => {
      const shortages: InsufficientStockDetail[] = [];

      for (const item of items) {
        const stock = await tx.stock.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId: item.storeId } }
        });

        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          shortages.push({
            productId: item.productId,
            storeId: item.storeId,
            requested: item.quantity,
            available
          });
        }
      }

      if (shortages.length > 0) {
        throw new InsufficientStockError(shortages);
      }

      for (const item of items) {
        await tx.stock.update({
          where: { productId_storeId: { productId: item.productId, storeId: item.storeId } },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      return { reserved: true };
    });
  },

  /** Returns previously reserved stock (e.g. on order cancellation). */
  async release(items: ReservationItem[]) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.stock.upsert({
          where: { productId_storeId: { productId: item.productId, storeId: item.storeId } },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, storeId: item.storeId, quantity: item.quantity }
        });
      }

      return { released: true };
    });
  }
};
