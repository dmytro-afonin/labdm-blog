import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { absoluteRuntimeUrl } from "../config/site";
import { envNewsletterTokenSecret } from "./server-env";

const verificationTokenLifetimeMs = 24 * 60 * 60 * 1000;
const verificationTokenPurpose = "newsletter-verification";

const verificationTokenPayloadSchema = z.object({
  subscriberId: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  exp: z.number(),
  purpose: z.literal(verificationTokenPurpose),
});

export type NewsletterVerificationTokenPayload = z.infer<
  typeof verificationTokenPayloadSchema
>;

export type NewsletterVerificationTokenResult =
  | {
      status: "valid";
      payload: NewsletterVerificationTokenPayload;
    }
  | {
      status: "expired";
      payload: NewsletterVerificationTokenPayload;
    }
  | {
      status: "invalid";
    };

function getTokenSecret(): string {
  const value = envNewsletterTokenSecret();
  if (!value) {
    throw new Error("NEWSLETTER_TOKEN_SECRET is not configured.");
  }
  return value;
}

function sign(value: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(value)
    .digest("base64url");
}

export function createNewsletterVerificationToken(input: {
  subscriberId: string;
  email: string;
}): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      subscriberId: input.subscriberId,
      email: input.email.toLowerCase(),
      exp: Date.now() + verificationTokenLifetimeMs,
      purpose: verificationTokenPurpose,
    } satisfies NewsletterVerificationTokenPayload),
    "utf8",
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyNewsletterVerificationToken(
  token: string,
): NewsletterVerificationTokenResult {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return { status: "invalid" };

  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature) return { status: "invalid" };

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(encodedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (actual.length !== expected.length) return { status: "invalid" };
  if (!timingSafeEqual(new Uint8Array(actual), new Uint8Array(expected))) {
    return { status: "invalid" };
  }

  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = verificationTokenPayloadSchema.safeParse(
      JSON.parse(decoded) as unknown,
    );
    if (!parsed.success) return { status: "invalid" };

    const payload = parsed.data;
    if (payload.exp <= Date.now()) {
      return { status: "expired", payload };
    }

    return { status: "valid", payload };
  } catch {
    return { status: "invalid" };
  }
}

export function buildNewsletterVerificationUrl(
  input: {
    subscriberId: string;
    email: string;
  },
  options?: { requestUrl?: string },
): string {
  const token = createNewsletterVerificationToken(input);
  // Build via searchParams so `?` cannot be encoded into the pathname (%3F),
  // which would 404 as `/c%3Ftoken=...` instead of `/c?token=...`.
  // Preview deployments use VERCEL_URL so confirm hits this deploy, not prod.
  const url = new URL("/c", absoluteRuntimeUrl("/", options));
  url.searchParams.set("token", token);
  return url.toString();
}
