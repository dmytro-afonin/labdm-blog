import type { APIRoute } from "astro";
import { waitUntil } from "@vercel/functions";

import {
  applyResendContactWebhookEvent,
  beginResendContactWebhookEvent,
  finishResendContactWebhookEvent,
} from "../../../../lib/newsletter";
import {
  captureServerException,
  captureServerOutcome,
  flushPostHogServer,
} from "../../../../lib/posthog-server-tracking";
import { getRequestId, withRequestId } from "../../../../lib/request-id";
import { verifyResendContactWebhook } from "../../../../lib/resend";

export const prerender = false;

const PH_ROUTE = "POST /api/webhooks/resend/contacts";

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  try {
    let payload: string;
    try {
      payload = await request.text();
    } catch (error) {
      const message = "Failed to read request body.";
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "request_body_read_failed",
        request,
        requestId,
        properties: { message },
      });
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "request.text",
        request,
        requestId,
      });
      return withRequestId(new Response(message, { status: 400 }), requestId);
    }

    let event;
    try {
      event = verifyResendContactWebhook(payload, request.headers);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid webhook signature.";
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "webhook_verification_failed",
        request,
        requestId,
        properties: { message },
      });
      return withRequestId(new Response(message, { status: 400 }), requestId);
    }

    const providerEventId = request.headers.get("svix-id");
    if (!providerEventId) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "missing_svix_id",
        request,
        requestId,
      });
      return withRequestId(
        new Response("Missing svix-id header.", { status: 400 }),
        requestId,
      );
    }

    let begun;
    try {
      begun = await beginResendContactWebhookEvent({
        providerEventId,
        eventType: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    } catch (error) {
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "beginResendContactWebhookEvent",
        request,
        requestId,
        extra: { provider_event_id: providerEventId },
      });
      console.error("Resend contact webhook begin failed", {
        requestId,
        providerEventId,
        error,
      });
      return withRequestId(
        new Response("Failed to begin webhook processing.", { status: 500 }),
        requestId,
      );
    }

    if (
      begun.duplicate &&
      (begun.existingStatus === "success" || begun.existingStatus === "ignored")
    ) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "duplicate_ignored",
        request,
        requestId,
        properties: { existing_status: begun.existingStatus },
      });
      return withRequestId(
        Response.json({ ok: true, duplicate: true }),
        requestId,
      );
    }

    if (!begun.eventId) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "reservation_failed",
        request,
        requestId,
        properties: { duplicate: begun.duplicate },
      });
      return withRequestId(
        new Response("Webhook event could not be reserved.", {
          status: 500,
        }),
        requestId,
      );
    }

    try {
      const result = await applyResendContactWebhookEvent(event);
      await finishResendContactWebhookEvent({
        eventId: begun.eventId,
        subscriberId: result.subscriberId,
        status: result.status,
        errorMessage: result.message ?? null,
      });
      return withRequestId(
        Response.json({ ok: true, status: result.status }),
        requestId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Webhook processing failed.";
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "applyResendContactWebhookEvent",
        request,
        requestId,
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
        captureServerException({
          error: finishError,
          route: PH_ROUTE,
          branch: "finishResendContactWebhookEvent",
          request,
          requestId,
          extra: { event_id: begun.eventId },
        });
      }
      console.error("Resend contact webhook processing failed", {
        eventId: begun.eventId,
        error: message,
      });
      return withRequestId(
        new Response("Webhook processing failed.", { status: 500 }),
        requestId,
      );
    }
  } finally {
    waitUntil(flushPostHogServer());
  }
};
