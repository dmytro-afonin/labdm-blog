import type { APIRoute } from "astro";

import { confirmNewsletterSubscription } from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect }) => {
  if (!isDatabaseConfigured()) {
    return redirect("/newsletter/error");
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return redirect("/newsletter/confirm-invalid");
  }

  try {
    const result = await confirmNewsletterSubscription(token);
    if (result === "invalid") {
      return redirect("/newsletter/confirm-invalid");
    }
    if (result === "expired") {
      return redirect("/newsletter/confirm-expired");
    }
    return redirect("/newsletter/confirmed");
  } catch {
    return redirect("/newsletter/error");
  }
};
