import type { APIRoute } from "astro";

import {
  applyResendContactWebhookEvent,
  beginResendContactWebhookEvent,
  finishResendContactWebhookEvent,
} from "../../../../lib/newsletter";
import { verifyResendContactWebhook } from "../../../../lib/resend";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();

  let event;
  try {
    event = verifyResendContactWebhook(payload, request.headers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    return new Response(message, { status: 400 });
  }

  const providerEventId = request.headers.get("svix-id");
  if (!providerEventId) {
    return new Response("Missing svix-id header.", { status: 400 });
  }

  const begun = await beginResendContactWebhookEvent({
    providerEventId,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  if (
    begun.duplicate &&
    (begun.existingStatus === "success" || begun.existingStatus === "ignored")
  ) {
    return Response.json({ ok: true, duplicate: true });
  }

  if (!begun.eventId) {
    return new Response("Webhook event could not be reserved.", {
      status: 500,
    });
  }

  try {
    const result = await applyResendContactWebhookEvent(event);
    await finishResendContactWebhookEvent({
      eventId: begun.eventId,
      subscriberId: result.subscriberId,
      status: result.status,
      errorMessage: result.message ?? null,
    });
    return Response.json({ ok: true, status: result.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    try {
      await finishResendContactWebhookEvent({
        eventId: begun.eventId,
        subscriberId: null,
        status: "failed",
        errorMessage: message,
      });
    } catch (finishError) {
      console.error(
        "Failed to persist Resend contact webhook failure",
        finishError,
      );
    }
    console.error("Resend contact webhook processing failed", {
      eventId: begun.eventId,
      error: message,
    });
    return new Response("Webhook processing failed.", { status: 500 });
  }
};
