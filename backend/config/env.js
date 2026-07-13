import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Masters Union links API — stores screenshots and returns the CDN url.
  LINKS_API_BASE_URL: z
    .string()
    .url('LINKS_API_BASE_URL must be a valid URL')
    .default('https://api.mastersunion.org/api'),

  PUPPETEER_HEADLESS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  PUPPETEER_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  LINKEDIN_BROWSER_PROFILE_PATH: z.string().min(1).default('./browser-profile/linkedin'),

  ADMIN_JWT_SECRET: z.string().min(16).default('dev-admin-jwt-secret-change-me'),

  // Shared invite code required to create an account. Set it once; teammates
  // self-register with it. When unset, sign-up is disabled.
  SIGNUP_INVITE_CODE: z.string().optional(),

  // Key used to encrypt each user's stored LinkedIn cookies at rest. Falls back
  // to ADMIN_JWT_SECRET so the app still boots without extra config, but set a
  // dedicated value in production.
  SESSION_ENCRYPTION_KEY: z.string().min(16).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.errors
    .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
    .join('\n');
  throw new Error(`Environment validation failed:\n${formatted}`);
}

const raw = parsed.data;

const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
};

export default env;
