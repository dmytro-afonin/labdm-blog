import type { APIRoute } from "astro";
import { getNeonSql, isDatabaseConfigured } from "../../lib/neon";

export const prerender = false;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return redirect("/newsletter/thanks");
  }

  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || !emailPattern.test(email)) {
    return redirect("/newsletter/invalid");
  }

  try {
    const sql = getNeonSql();
    const inserted = await sql`
      INSERT INTO subscribers (email)
      VALUES (${email})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    const rows = inserted as { id: string }[];
    if (!rows.length) {
      return redirect("/newsletter/already");
    }
    return redirect("/newsletter/thanks");
  } catch {
    return redirect("/newsletter/error");
  }
};
