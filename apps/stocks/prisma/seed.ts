import { PrismaClient } from './generated/client/index.js';

const prisma = new PrismaClient();

const STORES = [
  { name: 'Okaz Paris', city: 'Paris' },
  { name: 'Okaz Lyon', city: 'Lyon' },
  { name: 'Okaz Marseille', city: 'Marseille' }
];

const main = async () => {
  for (const store of STORES) {
    const existing = await prisma.store.findFirst({ where: { name: store.name } });
    if (!existing) {
      await prisma.store.create({ data: store });
    }
  }

  const stores = await prisma.store.findMany();
  // eslint-disable-next-line no-console
  console.log(`Seeded ${stores.length} stores.`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
