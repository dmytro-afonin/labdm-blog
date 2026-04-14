import type { APIRoute } from "astro";

import {
  performNewsletterManageAction,
  type NewsletterManageAction,
} from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";

export const prerender = false;

function isManageAction(value: string): value is NewsletterManageAction {
  return value === "unsubscribe" || value === "resubscribe";
}

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isDatabaseConfigured()) {
    return redirect("/newsletter/error");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return redirect("/newsletter/manage-invalid");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect("/newsletter/manage-invalid");
  }

  const token = formData.get("token");
  const action = formData.get("action");
  if (
    typeof token !== "string" ||
    typeof action !== "string" ||
    !isManageAction(action)
  ) {
    return redirect("/newsletter/manage-invalid");
  }

  try {
    const result = await performNewsletterManageAction(token, action);
    if (result === "invalid") {
      return redirect("/newsletter/manage-invalid");
    }
    if (result === "unsubscribed") {
      return redirect("/newsletter/unsubscribed");
    }
    return redirect("/newsletter/resubscribed");
  } catch {
    return redirect("/newsletter/error");
  }
};
