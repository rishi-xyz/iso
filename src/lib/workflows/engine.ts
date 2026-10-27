import { db } from "@/lib/db";
import { ciFailureInvestigationWorkflow } from "./builtins/ci-failure";

export async function ensureBuiltInWorkflows() {
  try {
    await (db.orm.public as any).WorkflowDefinition?.upsert?.({
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
  } catch (e) {
    console.error(e);
  }
}

export async function createRun(params: {
  tenantId: string;
  repositoryId: string;
  workflowId: string;
  commitSha?: string;
  workflowRunId?: string;
}) {
  const workflow: any = await (db.orm.public as any).WorkflowDefinition?.findUnique?.({
    where: { workflowId: params.workflowId },
  });
  if (!workflow) throw new Error("Workflow not found");

  const run: any = await (db.orm.public as any).Run?.create?.({
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

  try {
    await (db.orm.public as any).Job?.create?.({
      data: {
        type: "process_run",
        payload: { runId: run.id },
        runId: run.id,
        status: "pending",
      },
    });
  } catch (e) {
    console.error(e);
  }

  return run;
}
