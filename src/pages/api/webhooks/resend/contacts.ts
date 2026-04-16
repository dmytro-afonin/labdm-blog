import type { APIRoute } from "astro";

import {
  applyResendContactWebhookEvent,
  beginResendContactWebhookEvent,
  finishResendContactWebhookEvent,
} from "../../../../lib/newsletter";
import {
  captureServerException,
  captureServerOutcome,
} from "../../../../lib/posthog-server-tracking";
import { verifyResendContactWebhook } from "../../../../lib/resend";

export const prerender = false;

const PH_ROUTE = "POST /api/webhooks/resend/contacts";

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();

  let event;
  try {
    event = verifyResendContactWebhook(payload, request.headers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "webhook_verification_failed",
      request,
      properties: { message },
    });
    return new Response(message, { status: 400 });
  }

  const providerEventId = request.headers.get("svix-id");
  if (!providerEventId) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "missing_svix_id",
      request,
    });
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
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "duplicate_ignored",
      request,
      properties: { existing_status: begun.existingStatus },
    });
    return Response.json({ ok: true, duplicate: true });
  }

  if (!begun.eventId) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "reservation_failed",
      request,
      properties: { duplicate: begun.duplicate },
    });
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
    await captureServerException({
      error,
      route: PH_ROUTE,
      branch: "applyResendContactWebhookEvent",
      request,
      extra: { event_id: begun.eventId },
    });
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
      try {
        await captureServerException({
          error: finishError,
          route: PH_ROUTE,
          branch: "finishResendContactWebhookEvent_failed",
          request,
          extra: { event_id: begun.eventId },
        });
      } catch (phErr) {
        console.warn("[posthog] webhook finish failure capture failed", phErr);
      }
    }
    console.error("Resend contact webhook processing failed", {
      eventId: begun.eventId,
      error: message,
    });
    return new Response("Webhook processing failed.", { status: 500 });
  }
};
