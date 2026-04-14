import { getNewsletterSyncReport } from "../src/lib/newsletter";

function parseLimit(): number | undefined {
  const raw = process.argv[2];
  if (!raw) return undefined;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("newsletter:sync:report limit must be a positive integer.");
  }

  return value;
}

try {
  const report = await getNewsletterSyncReport(parseLimit());

  console.log(`Subscribers: ${report.counts.total}`);
  console.log(`Pending sync: ${report.counts.pending}`);
  console.log(`Synced: ${report.counts.synced}`);
  console.log(`Failed: ${report.counts.failed}`);

  if (report.failedSubscribers.length) {
    console.log("");
    console.log("Failed subscribers:");
    for (const subscriber of report.failedSubscribers) {
      console.log(`- ${subscriber.email}`);
      console.log(`  attempts: ${subscriber.syncAttemptCount}`);
      console.log(`  requested: ${subscriber.syncRequestedAt}`);
      console.log(`  last synced: ${subscriber.lastSyncedAt ?? "never"}`);
      console.log(`  error: ${subscriber.lastSyncError ?? "unknown"}`);
    }
  }
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Newsletter sync report failed.";
  console.error(message);
  process.exit(1);
}
