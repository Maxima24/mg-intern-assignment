import { z } from 'zod';

/**
 * Zod schema for the "upload contract" form. This is the ONE place the web app
 * validates the text fields before building the multipart request. It is NOT the
 * wire contract — the wire types are generated from the NestJS OpenAPI spec into
 * `@mango/shared/api`. The PDF file itself is handled outside this schema (held in
 * component state and appended to FormData), matching the dropzone convention.
 *
 * `redirectUrl` is not a user-facing field: the web app computes it as
 * `${SITE_URL}/signing-complete` and appends it at submit time.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164-ish: optional +, 8-15 digits.
const PHONE_RE = /^\+?[0-9]{8,15}$/;

export const uploadContractFormSchema = z.object({
  signerName: z
    .string()
    .trim()
    .min(2, 'Signer name is required')
    .max(120, 'Signer name is too long'),
  signerIdentifier: z
    .string()
    .trim()
    .min(3, 'Email or phone is required')
    .refine((v) => EMAIL_RE.test(v) || PHONE_RE.test(v), {
      message: 'Enter a valid email address or phone number',
    }),
  birthYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter a 4-digit year')
    .optional()
    .or(z.literal('')),
  documentName: z.string().trim().max(160, 'Document name is too long').optional().or(z.literal('')),
});

export type UploadContractFormValues = z.infer<typeof uploadContractFormSchema>;
