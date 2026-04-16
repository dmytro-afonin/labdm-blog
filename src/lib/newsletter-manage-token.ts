import { createHmac, timingSafeEqual } from "node:crypto";

import { absoluteUrl } from "../config/site";
import { envNewsletterTokenSecret } from "./server-env";

export interface NewsletterManageTokenPayload {
  subscriberId: string;
  email: string;
}

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

export function createNewsletterManageToken(
  payload: NewsletterManageTokenPayload,
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      subscriberId: payload.subscriberId,
      email: payload.email.toLowerCase(),
    }),
    "utf8",
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyNewsletterManageToken(
  token: string,
): NewsletterManageTokenPayload | null {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(encodedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as {
      subscriberId?: unknown;
      email?: unknown;
    };

    if (
      typeof parsed.subscriberId !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return {
      subscriberId: parsed.subscriberId,
      email: parsed.email.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function buildNewsletterManageUrl(
  payload: NewsletterManageTokenPayload,
): string {
  return absoluteUrl(
    `/newsletter/manage/${createNewsletterManageToken(payload)}`,
  );
}
