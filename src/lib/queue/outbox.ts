import { db } from "@/lib/db";

export async function enqueueJob(type: string, payload: any, runId?: string) {
  return (db.orm.public as any).Job?.create?.({
    data: {
      type,
      payload,
      runId: runId || null,
      status: "pending",
      attempts: 0,
      maxAttempts: 5,
    },
  });
}
