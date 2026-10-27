import { prisma } from "@/lib/prisma";
import { ciFailureInvestigationWorkflow } from "./builtins/ci-failure";

export async function ensureBuiltInWorkflows() {
  await prisma.workflowDefinition.upsert({
    where: { workflowId: ciFailureInvestigationWorkflow.workflowId },
    update: {},
    create: {
      workflowId: ciFailureInvestigationWorkflow.workflowId,
      version: ciFailureInvestigationWorkflow.version,
      name: ciFailureInvestigationWorkflow.name,
      enabled: ciFailureInvestigationWorkflow.enabled,
      trigger: ciFailureInvestigationWorkflow.trigger,
      steps: ciFailureInvestigationWorkflow.steps,
      definition: ciFailureInvestigationWorkflow.definition,
    },
  });
}

export async function createRun(params: {
  tenantId: string;
  repositoryId: string;
  workflowId: string;
  commitSha?: string;
  workflowRunId?: string;
}) {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { workflowId: params.workflowId },
  });
  if (!workflow) throw new Error("Workflow not found");

  const run = await prisma.run.create({
    data: {
      tenantId: params.tenantId,
      repositoryId: params.repositoryId,
      workflowId: params.workflowId,
      workflowVersion: workflow.version,
      commitSha: params.commitSha,
      workflowRunId: params.workflowRunId,
      lifecycleState: "queued",
    },
  });

  // Enqueue job
  await prisma.job.create({
    data: {
      type: "process_run",
      payload: { runId: run.id },
      runId: run.id,
      status: "pending",
    },
  });

  return run;
}
