import { Prisma } from '@prisma/client';
import { signAccessToken } from '@okaz/shared';

import { authConfig } from '../../config/auth.config.js';
import { prisma } from '../../db/prisma.client.js';
import { hashPassword, verifyPassword } from './auth.security.js';

type Credentials = {
  email: string;
  password: string;
};

export const authService = {
  async register(credentials: Credentials) {
    const passwordHash = await hashPassword(credentials.password);

    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash,
        roles: ['CUSTOMER']
      }
    });

    return {
      id: user.id,
      email: user.email,
      roles: user.roles
    };
  },

  async login(credentials: Credentials) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) {
      return null;
    }

    const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    const accessToken = await signAccessToken(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles as ('CUSTOMER' | 'STORE_MANAGER' | 'ADMIN')[]
      },
      authConfig.jwt
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles
      }
    };
  }
};

export const isUniqueConstraintError = (error: unknown) => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};
