import { PrismaClient } from '@prisma/client';
import { Algorithm, hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed script is dev-only and must not run in production.');
  }

  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com').toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234!';

  const passwordHash = await hash(adminPassword, {
    algorithm: Algorithm.Argon2id
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roles: ['ADMIN']
    },
    create: {
      email: adminEmail,
      passwordHash,
      roles: ['ADMIN']
    }
  });
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
