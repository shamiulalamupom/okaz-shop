import { Prisma } from '@prisma/client';
import { signAccessToken } from '@okaz/shared';

import { authConfig } from '../../config/auth.config.js';
import { prisma } from '../../db/prisma.client.js';
import { hashPassword, verifyPassword } from './auth.security.js';

type Credentials = {
  email: string;
  password: string;
};

type ProfileUpdate = {
  avatarUrl?: string;
  avatarMediaId?: string;
  nom?: string;
  prenom?: string;
};

type UserRecord = {
  id: string;
  email: string;
  roles: string[];
  nom: string | null;
  prenom: string | null;
  avatarUrl: string | null;
  avatarMediaId: string | null;
};

const publicUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  roles: user.roles,
  nom: user.nom,
  prenom: user.prenom,
  avatarUrl: user.avatarUrl,
  avatarMediaId: user.avatarMediaId
});

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

    return publicUser(user);
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? publicUser(user) : null;
  },

  async updateProfile(id: string, data: ProfileUpdate) {
    const user = await prisma.user.update({ where: { id }, data });
    return publicUser(user);
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
      user: publicUser(user)
    };
  }
};

export const isUniqueConstraintError = (error: unknown) => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
};
