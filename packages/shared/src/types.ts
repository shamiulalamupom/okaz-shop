export const USER_ROLES = ['CUSTOMER', 'STORE_MANAGER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserContext = {
  id: string;
  email: string;
  roles: UserRole[];
};

export type AccessTokenClaims = {
  sub: string;
  email: string;
  roles: UserRole[];
  iat: number;
  exp: number;
  iss: string;
  aud: string | string[];
};
