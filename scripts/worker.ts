import { prisma } from "../src/lib/prisma";
import { getInstallationToken } from "../src/lib/github/app";
import { GitHubClient } from "../src/lib/github/client";
import { redactSecrets, truncateLog } from "../src/lib/redact";
import { diagnoseWithTokenFactory } from "../src/lib/model/token-factory";

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "2000");
const LEASE_SECONDS = parseInt(process.env.WORKER_LEASE_SECONDS || "60");

async function processJob() {
  const now = new Date();
  
  const job = await (prisma as any).$transaction(async (tx: any) => {
    const jobs = await tx.job.findMany({
      where: {
        status: { in: ["pending", "failed"] },
        attempts: { lt: 5 },
        OR: [
          { leaseUntil: null },
          { leaseUntil: { lt: now } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 1,
    });

    if (jobs.length === 0) return null;
    
    const j = jobs[0];
    const leaseUntil = new Date(now.getTime() + LEASE_SECONDS * 1000);
    
    return tx.job.update({
      where: { id: j.id },
      data: {
        status: "running",
        attempts: { increment: 1 },
        leaseUntil,
        startedAt: j.startedAt || now,
      },
    });
  });

  if (!job) return;

  try {
    if ((job as any).type === "process_run") {
      await processRun((job as any).payload as any);
    }
    await (prisma as any).job.update({
      where: { id: (job as any).id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        result: { success: true },
      },
    });
  } catch (error: any) {
    console.error("Job error:", error);
    await (prisma as any).job.update({
      where: { id: (job as any).id },
      data: {
        status: (job as any).attempts >= 4 ? "failed" : "pending",
        lastError: error.message,
        leaseUntil: null,
      },
    });
  }
}

async function processRun(payload: { runId: string }) {
  const run: any = await (prisma as any).run.findUnique({
    where: { id: payload.runId },
    include: {
      repository: true,
      workflowDefinition: true,
    },
  });

  if (!run) throw new Error("Run not found");

  await (prisma as any).run.update({
    where: { id: run.id },
    data: { lifecycleState: "collecting_context", startedAt: new Date() },
  });

  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const tokenData: any = await getInstallationToken(appId, privateKey, run.repository.githubInstallationId);
  const client = new GitHubClient(tokenData.token);

  let logs = "";
  try {
    if (run.workflowRunId) {
      const jobsData: any = await client.fetchJson(`https://api.github.com/repos/${run.repository.owner}/${run.repository.name}/actions/runs/${run.workflowRunId}/jobs`);
      const failedJob = jobsData.jobs?.find((j: any) => j.conclusion === "failure");
      if (failedJob) {
        logs = await client.getJobLogs(run.repository.owner, run.repository.name, failedJob.id);
        await (prisma as any).evidence.create({
          data: {
            runId: run.id,
            type: "job",
            ref: String(failedJob.id),
            content: logs.slice(0, 5000),
            metadata: { name: failedJob.name },
          },
        });
      }
    }
  } catch (e: any) {
    console.error("Error collecting logs:", e.message);
  }

  const redactedLogs = redactSecrets(truncateLog(logs));
  
  await (prisma as any).run.update({
    where: { id: run.id },
    data: { lifecycleState: "analyzing" },
  });

  const modelConfig: any = await (prisma as any).modelConfig.findFirst({
    where: { enabled: true },
  });

  let apiKey = modelConfig?.apiKey || process.env.NEBIUS_TOKEN_FACTORY_API_KEY;
  const baseUrl = modelConfig?.baseUrl || process.env.NEBIUS_TOKEN_FACTORY_BASE_URL;
  const modelId = modelConfig?.modelId || process.env.NEBIUS_MODEL_ID;

  if (!apiKey || !modelId) {
    throw new Error("Missing model configuration");
  }

  const context = `Repository: ${run.repository.fullName}
Commit: ${run.commitSha}
Workflow Run: ${run.workflowRunId}

Failed logs (redacted):
${redactedLogs.slice(0, 30000)}

Analyze this CI failure.`;

  try {
    const diagnosis: any = await diagnoseWithTokenFactory({
      baseUrl,
      apiKey,
      modelId,
      context,
    });

    await (prisma as any).run.update({
      where: { id: run.id },
      data: { 
        lifecycleState: "reporting",
        modelProvider: "nebius-token-factory",
        modelId,
      },
    });

    for (const cause of diagnosis.likelyCauses || []) {
      await (prisma as any).finding.create({
        data: {
          runId: run.id,
          category: "failure_cause",
          severity: "high",
          state: "suspected",
          summary: cause.text,
          details: { confidence: cause.confidence },
          evidenceRefs: cause.evidenceIds || [],
        },
      });
    }

    await (prisma as any).run.update({
      where: { id: run.id },
      data: {
        lifecycleState: "completed",
        outcome: "diagnosis_ready",
        finishedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    await (prisma as any).run.update({
      where: { id: run.id },
      data: {
        lifecycleState: "failed",
        outcome: "execution_failed",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

async function main() {
  console.log("Worker starting...");
  while (true) {
    try {
      await processJob();
    } catch (e) {
      console.error("Worker loop error:", e);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

main();
