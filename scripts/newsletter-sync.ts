import { syncPendingSubscribers } from "../src/lib/newsletter";

function redactEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "***";
  }

  return `${normalized[0]}***${normalized.slice(atIndex)}`;
}

function parseLimit(): number | undefined {
  const raw = process.argv[2];
  if (!raw) return undefined;

  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error("newsletter:sync limit must be a positive integer.");
  }

  const value = Number.parseInt(normalized, 10);
  if (value <= 0) {
    throw new Error("newsletter:sync limit must be a positive integer.");
  }

  return value;
}

try {
  const summary = await syncPendingSubscribers(parseLimit());

  console.log(`Attempted: ${summary.attempted}`);
  console.log(`Succeeded: ${summary.succeeded}`);
  console.log(`Failed: ${summary.failed}`);

  if (summary.failures.length) {
    console.log("");
    console.log("Failures:");
    for (const failure of summary.failures) {
      console.log(`- ${redactEmail(failure.email)}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Newsletter sync failed.";
  console.error(message);
  process.exit(1);
}
