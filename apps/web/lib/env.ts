import { z } from 'zod';

/**
 * Validated public environment. Only NEXT_PUBLIC_* vars — anything secret stays on
 * the backend. Referenced explicitly so Next inlines them at build time.
 */
const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid public environment configuration: ${msg}`);
}

export const env = parsed.data;
