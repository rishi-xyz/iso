import { prisma } from "@/lib/prisma";

export async function enqueueJob(type: string, payload: any, runId?: string) {
  return prisma.job.create({
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
