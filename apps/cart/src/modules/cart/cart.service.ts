import { productsClient } from '../../clients/products.client.js';
import { prisma } from '../../db/prisma.client.js';

export type CartErrorCode = 'PRODUCT_NOT_FOUND' | 'ITEM_NOT_FOUND' | 'PRODUCTS_SERVICE_UNAVAILABLE';

export class CartError extends Error {
  constructor(
    public readonly code: CartErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'CartError';
  }
}

const getOrCreateCart = async (userId: string) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  return prisma.cart.create({ data: { userId } });
};

const fetchProduct = async (productId: string) => {
  try {
    return await productsClient.getProduct(productId);
  } catch {
    throw new CartError('PRODUCTS_SERVICE_UNAVAILABLE', 'Products service unavailable');
  }
};

const buildCartResponse = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { addedAt: 'asc' }
  });

  const enriched = await Promise.all(
    items.map(async (item) => {
      const product = await productsClient.getProduct(item.productId).catch(() => null);
      const unitPrice = product?.price ?? null;

      return {
        productId: item.productId,
        quantity: item.quantity,
        name: product?.name ?? null,
        unitPrice,
        lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
        available: product !== null
      };
    })
  );

  const total = enriched.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0);

  return {
    userId,
    items: enriched,
    total,
    updatedAt: cart.updatedAt
  };
};

export const cartService = {
  getCart(userId: string) {
    return buildCartResponse(userId);
  },

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await fetchProduct(productId);
    if (!product) {
      throw new CartError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const cart = await getOrCreateCart(userId);

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } }
    });

    await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

    return buildCartResponse(userId);
  },

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await getOrCreateCart(userId);
    const item = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });

    if (!item) {
      throw new CartError('ITEM_NOT_FOUND', 'Item not in cart');
    }

    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });

    return buildCartResponse(userId);
  },

  async removeItem(userId: string, productId: string) {
    const cart = await getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });

    return buildCartResponse(userId);
  },

  async clearCart(userId: string) {
    const cart = await getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return buildCartResponse(userId);
  }
};
