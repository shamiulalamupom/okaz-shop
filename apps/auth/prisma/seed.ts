import { PrismaClient } from '@prisma/client';
import { Algorithm, hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

// Dev fixtures. The admin can be overridden via env; the rest are fixed so the
// full seed script (scripts/seed.mjs) can log in as them deterministically.
const users = [
  {
    email: (process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234!',
    roles: ['ADMIN']
  },
  { email: 'manager@example.com', password: 'Manager1234!', roles: ['STORE_MANAGER'] },
  { email: 'alice@example.com', password: 'Password123', roles: ['CUSTOMER'] },
  { email: 'bob@example.com', password: 'Password123', roles: ['CUSTOMER'] }
];

const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed script is dev-only and must not run in production.');
  }

  for (const user of users) {
    const passwordHash = await hash(user.password, { algorithm: Algorithm.Argon2id });
    const email = user.email.toLowerCase();

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, roles: user.roles },
      create: { email, passwordHash, roles: user.roles }
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${users.length} users: ${users.map((u) => `${u.email} (${u.roles.join('/')})`).join(', ')}`);
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
