import { createPublicKey } from 'node:crypto';
import { z } from 'zod';

const publicKeySchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.replace(/\\n/g, '\n'))
  .superRefine((value, context) => {
    if (!/^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----/.test(value)) {
      context.addIssue({
        code: 'custom',
        message: 'JWT_PUBLIC_KEY must be an RSA PEM public key',
      });
      return;
    }

    try {
      const key = createPublicKey(value);
      if (key.asymmetricKeyType !== 'rsa') {
        context.addIssue({
          code: 'custom',
          message: 'JWT_PUBLIC_KEY must be an RSA public key',
        });
      } else if ((key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
        context.addIssue({
          code: 'custom',
          message: 'JWT_PUBLIC_KEY must be at least 2048 bits',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'JWT_PUBLIC_KEY must be a valid PEM public key',
      });
    }
  });

const jwtConfigSchema = z.object({
  issuer: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  publicKey: publicKeySchema,
  identityClaim: z.string().trim().min(1).default('sub'),
});

const result = jwtConfigSchema.safeParse({
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  publicKey: process.env.JWT_PUBLIC_KEY,
  identityClaim: process.env.JWT_IDENTITY_CLAIM,
});

if (!result.success) {
  const environmentNames: Record<string, string> = {
    issuer: 'JWT_ISSUER',
    audience: 'JWT_AUDIENCE',
    publicKey: 'JWT_PUBLIC_KEY',
    identityClaim: 'JWT_IDENTITY_CLAIM',
  };
  const invalidFields = result.error.issues
    .map(
      (issue) =>
        environmentNames[String(issue.path[0])] ?? issue.path.join('.'),
    )
    .filter((field, index, fields) => fields.indexOf(field) === index);
  throw new Error(`Invalid JWT configuration: ${invalidFields.join(', ')}`);
}

export const jwtConfig = {
  ...result.data,
  algorithm: 'RS256' as const,
};
