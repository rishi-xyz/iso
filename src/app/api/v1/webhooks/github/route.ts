import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGitHubSignature } from "@/lib/github/verify";
import { createRun } from "@/lib/workflows/engine";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const deliveryId = req.headers.get("x-github-delivery");
    const event = req.headers.get("x-github-event");

    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET || "";
    
    if (!verifyGitHubSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!deliveryId) {
      return NextResponse.json({ error: "Missing delivery id" }, { status: 400 });
    }

    // Check idempotency
    const existing = await prisma.webhookDelivery.findUnique({
      where: { githubDeliveryId: deliveryId },
    });
    if (existing?.processed) {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // Create delivery record
    await prisma.webhookDelivery.upsert({
      where: { githubDeliveryId: deliveryId },
      update: {},
      create: {
        githubDeliveryId: deliveryId,
        eventType: event || "unknown",
        signatureValid: true,
        payload: JSON.parse(rawBody),
        processed: false,
      },
    });

    // Handle workflow_run events
    if (event === "workflow_run") {
      const body = JSON.parse(rawBody);
      const workflowRun = body.workflow_run;
      
      if (workflowRun?.conclusion === "failure") {
        // Find repository
        const repo = await prisma.repository.findFirst({
          where: {
            githubRepoId: String(body.repository.id),
            enabled: true,
          },
          include: { tenant: true },
        });

        if (repo) {
          // Create run
          const run = await createRun({
            tenantId: repo.tenantId,
            repositoryId: repo.id,
            workflowId: "ci_failure_investigation",
            commitSha: workflowRun.head_sha,
            workflowRunId: String(workflowRun.id),
          });

          await prisma.webhookDelivery.update({
            where: { githubDeliveryId: deliveryId },
            data: { 
              processed: true, 
              processedAt: new Date(),
              repositoryId: repo.id,
            },
          });

          return NextResponse.json({ message: "Run created", runId: run.id }, { status: 200 });
        }
      }
    }

    await prisma.webhookDelivery.update({
      where: { githubDeliveryId: deliveryId },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
