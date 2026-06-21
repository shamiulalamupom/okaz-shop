import { prisma } from '../../db/prisma.client.js';

export const healthService = {
  async checkReadiness() {
    await prisma.$queryRaw`SELECT 1`;
  }
};
