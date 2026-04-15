import { Webhook } from "svix";

const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_USER_AGENT = "labdm-blog/newsletter-sync";

export interface ResendContact {
  id: string;
  email: string;
  unsubscribed: boolean;
  createdAt: string | null;
}

export interface ResendContactMutationResult {
  id: string;
}

export interface ResendContactWebhookPayload {
  id?: string;
  email?: string;
  unsubscribed?: boolean;
}

export interface ResendContactWebhookEvent {
  type: "contact.created" | "contact.updated" | "contact.deleted";
  created_at?: string;
  data: ResendContactWebhookPayload;
}

class ResendApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ResendApiError";
    this.status = status;
    this.body = body;
  }
}

function getRequiredEnv(name: "RESEND_WEBHOOK_SECRET"): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not configured.`);
  }
  return value.trim();
}

/**
 * Resend “Sending” API keys cannot call the Contacts API. Use a full-access key
 * here (`RESEND_CONTACTS_API_KEY`), or a single full-access `RESEND_API_KEY`.
 */
function getResendContactsApiKey(): string {
  const contacts = process.env.RESEND_CONTACTS_API_KEY?.trim();
  if (contacts) return contacts;
  const fallback = process.env.RESEND_API_KEY?.trim();
  if (fallback) return fallback;
  throw new Error(
    "RESEND_CONTACTS_API_KEY or RESEND_API_KEY must be configured for Resend Contacts API (newsletter sync). Send-only keys are not sufficient; use a full-access key or set RESEND_CONTACTS_API_KEY.",
  );
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;

  const maybeError = body as {
    message?: unknown;
    error?: unknown;
    name?: unknown;
  };

  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    return maybeError.message;
  }

  if (typeof maybeError.error === "string" && maybeError.error.trim()) {
    return maybeError.error;
  }

  return fallback;
}

function mapResendContact(value: unknown): ResendContact {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid Resend contact payload.");
  }

  const candidate = value as {
    id?: unknown;
    email?: unknown;
    unsubscribed?: unknown;
    created_at?: unknown;
  };

  if (typeof candidate.id !== "string" || typeof candidate.email !== "string") {
    throw new Error("Resend contact payload is missing id or email.");
  }

  return {
    id: candidate.id,
    email: candidate.email.toLowerCase(),
    unsubscribed: candidate.unsubscribed === true,
    createdAt:
      typeof candidate.created_at === "string" ? candidate.created_at : null,
  };
}

function mapMutationResult(value: unknown): ResendContactMutationResult {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid Resend mutation payload.");
  }

  const candidate = value as { id?: unknown };
  if (typeof candidate.id !== "string") {
    throw new Error("Resend mutation payload is missing id.");
  }

  return { id: candidate.id };
}

async function resendRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = getResendContactsApiKey();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", RESEND_USER_AGENT);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${RESEND_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown = raw || null;

  if (raw && contentType.includes("application/json")) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      body = raw;
    }
  }

  if (!response.ok) {
    throw new ResendApiError(
      extractErrorMessage(
        body,
        response.statusText || "Resend request failed.",
      ),
      response.status,
      body,
    );
  }

  return body as T;
}

export function isResendApiError(error: unknown): error is ResendApiError {
  return error instanceof ResendApiError;
}

export async function getResendContact(input: {
  id?: string | null;
  email?: string | null;
}): Promise<ResendContact | null> {
  const identifier =
    input.id?.trim() || input.email?.trim().toLowerCase() || "";
  if (!identifier) return null;

  try {
    const payload = await resendRequest<unknown>(
      `/contacts/${encodeURIComponent(identifier)}`,
      { method: "GET" },
    );
    return mapResendContact(payload);
  } catch (error) {
    if (isResendApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createResendContact(input: {
  email: string;
  unsubscribed: boolean;
}): Promise<ResendContactMutationResult> {
  const payload = await resendRequest<unknown>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      unsubscribed: input.unsubscribed,
    }),
  });

  return mapMutationResult(payload);
}

export async function updateResendContact(input: {
  id?: string | null;
  email?: string | null;
  unsubscribed: boolean;
}): Promise<ResendContactMutationResult> {
  const identifier =
    input.id?.trim() || input.email?.trim().toLowerCase() || "";
  if (!identifier) {
    throw new Error("Resend contact update requires an id or email.");
  }

  const payload = await resendRequest<unknown>(
    `/contacts/${encodeURIComponent(identifier)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        unsubscribed: input.unsubscribed,
      }),
    },
  );

  return mapMutationResult(payload);
}

function getRequiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name);
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name} header.`);
  }
  return value.trim();
}

export function verifyResendContactWebhook(
  payload: string,
  headers: Headers,
): ResendContactWebhookEvent {
  const webhookSecret = getRequiredEnv("RESEND_WEBHOOK_SECRET");
  const verified = new Webhook(webhookSecret).verify(payload, {
    "svix-id": getRequiredHeader(headers, "svix-id"),
    "svix-timestamp": getRequiredHeader(headers, "svix-timestamp"),
    "svix-signature": getRequiredHeader(headers, "svix-signature"),
  }) as unknown;

  if (!verified || typeof verified !== "object") {
    throw new Error("Invalid webhook payload.");
  }

  const candidate = verified as {
    type?: unknown;
    created_at?: unknown;
    data?: unknown;
  };

  if (
    candidate.type !== "contact.created" &&
    candidate.type !== "contact.updated" &&
    candidate.type !== "contact.deleted"
  ) {
    throw new Error("Unsupported Resend contact webhook type.");
  }

  if (!candidate.data || typeof candidate.data !== "object") {
    throw new Error("Webhook payload is missing contact data.");
  }

  const data = candidate.data as {
    id?: unknown;
    email?: unknown;
    unsubscribed?: unknown;
  };

  return {
    type: candidate.type,
    created_at:
      typeof candidate.created_at === "string"
        ? candidate.created_at
        : undefined,
    data: {
      id: typeof data.id === "string" ? data.id : undefined,
      email:
        typeof data.email === "string" ? data.email.toLowerCase() : undefined,
      unsubscribed:
        typeof data.unsubscribed === "boolean" ? data.unsubscribed : undefined,
    },
  };
}
