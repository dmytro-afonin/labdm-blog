import { createHmac, timingSafeEqual } from "node:crypto";

import { absoluteUrl } from "../config/site";
import { envNewsletterTokenSecret } from "./server-env";

const verificationTokenLifetimeMs = 24 * 60 * 60 * 1000;
const verificationTokenPurpose = "newsletter-verification";

export interface NewsletterVerificationTokenPayload {
  subscriberId: string;
  email: string;
  exp: number;
  purpose: typeof verificationTokenPurpose;
}

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
    const parsed = JSON.parse(decoded) as {
      subscriberId?: unknown;
      email?: unknown;
      exp?: unknown;
      purpose?: unknown;
    };

    if (
      typeof parsed.subscriberId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.purpose !== verificationTokenPurpose
    ) {
      return { status: "invalid" };
    }

    const payload: NewsletterVerificationTokenPayload = {
      subscriberId: parsed.subscriberId,
      email: parsed.email.toLowerCase(),
      exp: parsed.exp,
      purpose: verificationTokenPurpose,
    };

    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
      return { status: "expired", payload };
    }

    return { status: "valid", payload };
  } catch {
    return { status: "invalid" };
  }
}

export function buildNewsletterVerificationUrl(input: {
  subscriberId: string;
  email: string;
}): string {
  const token = createNewsletterVerificationToken(input);
  return absoluteUrl(`/c?token=${encodeURIComponent(token)}`);
}
