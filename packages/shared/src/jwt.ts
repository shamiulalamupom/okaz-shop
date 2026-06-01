import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

import { USER_ROLES, type AccessTokenClaims, type UserRole } from './types.js';

export type JwtConfig = {
  audience: string;
  expiresInSeconds: number;
  issuer: string;
  secret: string;
};

const claimsSchema = z.object({
  aud: z.union([z.string(), z.array(z.string())]),
  email: z.string().email(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string(),
  roles: z.array(z.enum(USER_ROLES)),
  sub: z.string().min(1)
});

const encoder = new TextEncoder();

export const signAccessToken = async (
  payload: {
    sub: string;
    email: string;
    roles: UserRole[];
  },
  config: JwtConfig
) => {
  return new SignJWT({
    email: payload.email,
    roles: payload.roles
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime(`${config.expiresInSeconds}s`)
    .sign(encoder.encode(config.secret));
};

export const verifyAccessToken = async (token: string, config: Omit<JwtConfig, 'expiresInSeconds'>) => {
  const { payload } = await jwtVerify(token, encoder.encode(config.secret), {
    audience: config.audience,
    issuer: config.issuer
  });

  return claimsSchema.parse(payload) as AccessTokenClaims;
};
