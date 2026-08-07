import { Webhook } from "svix";
import { z } from "zod";

import {
  envResendApiKey,
  envResendContactsApiKey,
  envResendSegmentId,
  envResendWebhookSecret,
} from "./server-env";

const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_USER_AGENT = "labdm-blog/newsletter";

export interface ResendContact {
  id: string;
  email: string;
  unsubscribed: boolean;
  createdAt: string | null;
}

export interface ResendContactMutationResult {
  id: string;
}

export interface ResendEmailSendResult {
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

const resendContactSchema = z.object({
  id: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  unsubscribed: z.boolean().optional(),
  created_at: z.string().optional(),
});

const resendMutationResultSchema = z.object({
  id: z.string().min(1),
});

const resendApiErrorBodySchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

const resendContactWebhookSchema = z.object({
  type: z.enum(["contact.created", "contact.updated", "contact.deleted"]),
  created_at: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    unsubscribed: z.boolean().optional(),
  }),
});

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

function requireResendWebhookSecret(): string {
  const value = envResendWebhookSecret();
  if (!value) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
  }
  return value;
}

// Prefer send-only `RESEND_API_KEY` for `/emails`; fall back to full-access
// `RESEND_CONTACTS_API_KEY`. Inverse of `getResendContactsApiKey` (contacts first).
function getResendEmailApiKey(): string {
  const sendOnly = envResendApiKey();
  if (sendOnly) return sendOnly;

  const fullAccess = envResendContactsApiKey();
  if (fullAccess) return fullAccess;

  throw new Error(
    "RESEND_API_KEY or RESEND_CONTACTS_API_KEY must be configured for Resend email sending.",
  );
}

/**
 * Resend “Sending” API keys cannot call the Contacts API. Use a full-access key
 * here (`RESEND_CONTACTS_API_KEY`), or a single full-access `RESEND_API_KEY`.
 */
function getResendContactsApiKey(): string {
  const contacts = envResendContactsApiKey();
  if (contacts) return contacts;
  const fallback = envResendApiKey();
  if (fallback) return fallback;
  throw new Error(
    "RESEND_CONTACTS_API_KEY or RESEND_API_KEY must be configured for Resend Contacts API (newsletter sync). Send-only keys are not sufficient; use a full-access key or set RESEND_CONTACTS_API_KEY.",
  );
}

/** Segment id for this environment’s list (prod vs preview). Required for contact sync. */
export function requireResendSegmentId(): string {
  const value = envResendSegmentId();
  if (!value) {
    throw new Error(
      "RESEND_SEGMENT_ID is not configured. Set the Resend segment for this environment (e.g. blog-prod / blog-preview).",
    );
  }
  return value;
}

function extractErrorMessage(body: unknown, fallback: string): string {
  const parsed = resendApiErrorBodySchema.safeParse(body);
  if (!parsed.success) return fallback;

  const message = parsed.data.message?.trim();
  if (message) return message;

  const error = parsed.data.error?.trim();
  if (error) return error;

  return fallback;
}

function mapResendContact(value: unknown): ResendContact {
  const parsed = resendContactSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid Resend contact payload.",
    );
  }

  return {
    id: parsed.data.id,
    email: parsed.data.email,
    unsubscribed: parsed.data.unsubscribed === true,
    createdAt: parsed.data.created_at ?? null,
  };
}

function mapMutationResult(value: unknown): ResendContactMutationResult {
  const parsed = resendMutationResultSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid Resend mutation payload.",
    );
  }
  return { id: parsed.data.id };
}

async function resendRequest<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<T> {
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
      getResendContactsApiKey(),
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
  /** Segment IDs to assign on create (`segments: [{ id }]`). */
  segmentIds?: string[];
}): Promise<ResendContactMutationResult> {
  const body: {
    email: string;
    unsubscribed: boolean;
    segments?: Array<{ id: string }>;
  } = {
    email: input.email,
    unsubscribed: input.unsubscribed,
  };
  if (input.segmentIds && input.segmentIds.length > 0) {
    // Resend expects objects, not bare strings ("expected object, received string").
    body.segments = input.segmentIds.map((id) => ({ id }));
  }

  const payload = await resendRequest<unknown>(
    "/contacts",
    getResendContactsApiKey(),
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return mapMutationResult(payload);
}

export async function addResendContactToSegment(input: {
  contactId: string;
  segmentId: string;
}): Promise<void> {
  try {
    await resendRequest<unknown>(
      `/contacts/${encodeURIComponent(input.contactId)}/segments/${encodeURIComponent(input.segmentId)}`,
      getResendContactsApiKey(),
      { method: "POST" },
    );
  } catch (error) {
    // Already a member — treat as success for idempotent sync.
    if (
      isResendApiError(error) &&
      (error.status === 409 || error.status === 422)
    ) {
      return;
    }
    throw error;
  }
}

export async function removeResendContactFromSegment(input: {
  contactId: string;
  segmentId: string;
}): Promise<void> {
  try {
    await resendRequest<unknown>(
      `/contacts/${encodeURIComponent(input.contactId)}/segments/${encodeURIComponent(input.segmentId)}`,
      getResendContactsApiKey(),
      { method: "DELETE" },
    );
  } catch (error) {
    if (isResendApiError(error) && error.status === 404) {
      return;
    }
    throw error;
  }
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
    getResendContactsApiKey(),
    {
      method: "PATCH",
      body: JSON.stringify({
        unsubscribed: input.unsubscribed,
      }),
    },
  );

  return mapMutationResult(payload);
}

export async function sendResendEmail(input: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<ResendEmailSendResult> {
  const payload = await resendRequest<unknown>(
    "/emails",
    getResendEmailApiKey(),
    {
      method: "POST",
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
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
  const webhookSecret = requireResendWebhookSecret();
  const verified = new Webhook(webhookSecret).verify(payload, {
    "svix-id": getRequiredHeader(headers, "svix-id"),
    "svix-timestamp": getRequiredHeader(headers, "svix-timestamp"),
    "svix-signature": getRequiredHeader(headers, "svix-signature"),
  }) as unknown;

  const parsed = resendContactWebhookSchema.safeParse(verified);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid webhook payload.",
    );
  }

  return {
    type: parsed.data.type,
    created_at: parsed.data.created_at,
    data: {
      id: parsed.data.data.id,
      email: parsed.data.data.email?.toLowerCase(),
      unsubscribed: parsed.data.data.unsubscribed,
    },
  };
}
