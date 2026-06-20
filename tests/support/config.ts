import 'dotenv/config';

/**
 * Test configuration sourced entirely from the environment (loaded from `.env`).
 * There are no hard-coded fallbacks: a missing required value fails fast with a
 * clear message instead of silently using a default.
 */
const fromEnv = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new Error(
    `Missing required environment variable (one of: ${names.join(', ')}). ` +
      `Set it in your .env file (see .env.example).`,
  );
};

export const testConfig = {
  gatewayUrl: fromEnv('TEST_GATEWAY_URL', 'GATEWAY_SERVICE_URL'),
  adminEmail: fromEnv('ADMIN_SEED_EMAIL'),
  adminPassword: fromEnv('ADMIN_SEED_PASSWORD'),
};
