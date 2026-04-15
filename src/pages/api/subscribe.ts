import type { APIRoute } from "astro";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
  subscribeNewsletterEmail,
} from "../../lib/newsletter";
import { isDatabaseConfigured } from "../../lib/neon";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isDatabaseConfigured()) {
    return redirect("/newsletter/error");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return redirect("/newsletter/invalid");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect("/newsletter/invalid");
  }

  const honeypot = formData.get("company");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return redirect("/newsletter/check-inbox");
  }

  const raw = formData.get("email");
  const email = typeof raw === "string" ? normalizeNewsletterEmail(raw) : "";
  if (!email || !isValidNewsletterEmail(email)) {
    return redirect("/newsletter/invalid");
  }

  try {
    const result = await subscribeNewsletterEmail(email);
    if (result === "check-inbox") {
      return redirect("/newsletter/check-inbox");
    }
    if (result === "already-subscribed") {
      return redirect("/newsletter/already");
    }
    if (result === "resubscribed") {
      return redirect("/newsletter/resubscribed");
    }
    return redirect("/newsletter/check-inbox");
  } catch {
    return redirect("/newsletter/error");
  }
};
