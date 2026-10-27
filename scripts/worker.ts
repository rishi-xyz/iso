import { db } from "../src/lib/db";
import { getInstallationToken } from "../src/lib/github/app";
import { GitHubClient } from "../src/lib/github/client";
import { redactSecrets, truncateLog } from "../src/lib/redact";
import { diagnoseWithTokenFactory } from "../src/lib/model/token-factory";

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "2000");
const LEASE_SECONDS = parseInt(process.env.WORKER_LEASE_SECONDS || "60");

async function processJob() {
  const now = new Date();
  
  // Simple non-transactional approach for Prisma 8
  const jobs: any[] = await (db.orm.public as any).Job?.findMany?.({
    where: {
      status: { in: ["pending", "failed"] },
      attempts: { lt: 5 },
    },
    take: 10,
  }) || [];

  for (const j of jobs) {
    if (j.leaseUntil && new Date(j.leaseUntil) > now) continue;
    
    try {
      const job = await (db.orm.public as any).Job?.update?.({
        where: { id: j.id },
        data: {
          status: "running",
          attempts: { increment: 1 },
          leaseUntil: new Date(now.getTime() + LEASE_SECONDS * 1000),
          startedAt: j.startedAt || now,
        },
      });
      
      if (job) {
        try {
          if (job.type === "process_run") {
            await processRun(job.payload);
          }
          await (db.orm.public as any).Job?.update?.({
            where: { id: job.id },
            data: {
              status: "completed",
              finishedAt: new Date(),
              result: { success: true },
            },
          });
        } catch (error: any) {
          console.error("Job error:", error);
          await (db.orm.public as any).Job?.update?.({
            where: { id: job.id },
            data: {
              status: (job.attempts >= 4) ? "failed" : "pending",
              lastError: error.message,
              leaseUntil: null,
            },
          });
        }
        break;
      }
    } catch (e) {
      continue;
    }
  }
}

async function processRun(payload: any) {
  const run: any = await (db.orm.public as any).Run?.findUnique?.({
    where: { id: payload.runId },
    include: {
      repository: true,
      workflowDefinition: true,
    },
  });

  if (!run) throw new Error("Run not found");

  await (db.orm.public as any).Run?.update?.({
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
        try {
          await (db.orm.public as any).Evidence?.create?.({
            data: {
              runId: run.id,
              type: "job",
              ref: String(failedJob.id),
              content: logs.slice(0, 5000),
              metadata: { name: failedJob.name },
            },
          });
        } catch (e) {}
      }
    }
  } catch (e: any) {
    console.error("Error collecting logs:", e.message);
  }

  const redactedLogs = redactSecrets(truncateLog(logs));
  
  await (db.orm.public as any).Run?.update?.({
    where: { id: run.id },
    data: { lifecycleState: "analyzing" },
  });

  const modelConfig: any = await (db.orm.public as any).ModelConfig?.findFirst?.({
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

    await (db.orm.public as any).Run?.update?.({
      where: { id: run.id },
      data: { 
        lifecycleState: "reporting",
        modelProvider: "nebius-token-factory",
        modelId,
      },
    });

    for (const cause of diagnosis.likelyCauses || []) {
      try {
        await (db.orm.public as any).Finding?.create?.({
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
      } catch (e) {}
    }

    await (db.orm.public as any).Run?.update?.({
      where: { id: run.id },
      data: {
        lifecycleState: "completed",
        outcome: "diagnosis_ready",
        finishedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    await (db.orm.public as any).Run?.update?.({
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
