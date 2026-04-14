import { syncPendingSubscribers } from "../src/lib/newsletter";

function parseLimit(): number | undefined {
  const raw = process.argv[2];
  if (!raw) return undefined;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
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
      console.log(`- ${failure.email}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Newsletter sync failed.";
  console.error(message);
  process.exit(1);
}
