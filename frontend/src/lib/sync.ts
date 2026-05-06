import { apiClient, NetworkError } from "@/lib/api-client";
import { db, type OutboxEntry } from "@/lib/db";

const MAX_RETRIES = 5;
let flushing = false;

async function executeEntry(entry: OutboxEntry) {
  const fn =
    entry.method === "POST"
      ? apiClient.post
      : entry.method === "PUT"
        ? apiClient.put
        : apiClient.delete;
  return fn(entry.endpoint, entry.payload as never);
}

export async function flushOutbox(): Promise<{ processed: number; failed: number }> {
  if (flushing) return { processed: 0, failed: 0 };
  flushing = true;
  let processed = 0;
  let failed = 0;
  try {
    const pending = await db.outbox.orderBy("createdAt").toArray();
    for (const entry of pending) {
      if (!entry.id) continue;
      try {
        await executeEntry(entry);
        await db.outbox.delete(entry.id);
        processed++;
      } catch (err) {
        if (err instanceof NetworkError) {
          // Stop trying — wait until we're back online.
          break;
        }
        failed++;
        const retries = entry.retries + 1;
        if (retries >= MAX_RETRIES) {
          await db.outbox.delete(entry.id);
        } else {
          await db.outbox.update(entry.id, {
            retries,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  } finally {
    flushing = false;
  }
  return { processed, failed };
}

export function startSyncManager() {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => {
    void flushOutbox();
  };
  window.addEventListener("online", onOnline);
  // Try once at boot.
  void flushOutbox();
  return () => {
    window.removeEventListener("online", onOnline);
  };
}

export async function enqueueOutbox(
  entry: Omit<OutboxEntry, "id" | "retries" | "createdAt">,
) {
  await db.outbox.add({
    ...entry,
    retries: 0,
    createdAt: Date.now(),
  });
}
