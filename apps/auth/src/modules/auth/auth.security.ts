import { Algorithm, hash, verify } from '@node-rs/argon2';

export const hashPassword = (password: string) => {
  return hash(password, {
    algorithm: Algorithm.Argon2id
  });
};

export const verifyPassword = (password: string, passwordHash: string) => {
  return verify(passwordHash, password, {
    algorithm: Algorithm.Argon2id
  });
};
