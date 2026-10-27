import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInstallationToken, createAppJwt } from "@/lib/github/app";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const installationId = searchParams.get("installation_id");
    const setupAction = searchParams.get("setup_action");

    if (!installationId) {
      return NextResponse.redirect(new URL("/install", req.url));
    }

    const appId = process.env.GITHUB_APP_ID!;
    const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    
    // Get installation details
    const appJwt = createAppJwt(appId, privateKey);
    const installRes = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    
    if (!installRes.ok) {
      throw new Error("Failed to fetch installation");
    }
    
    const installation = await installRes.json();
    
    // Create or update tenant
    let tenant: any = await (db.orm.public as any).Tenant?.findFirst?.();
    if (!tenant) {
      tenant = await (db.orm.public as any).Tenant?.create?.({
        data: { name: "Default Tenant", plan: "free" },
      });
    }

    // Get repositories for this installation
    const tokenData = await getInstallationToken(appId, privateKey, installationId);
    const reposRes = await fetch("https://api.github.com/installation/repositories", {
      headers: {
        Authorization: `Bearer ${tokenData.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    
    const reposData = await reposRes.json();
    
    for (const repo of reposData.repositories || []) {
      try {
        await (db.orm.public as any).Repository?.upsert?.({
          where: { githubRepoId: String(repo.id) },
          update: {
            githubInstallationId: installationId,
            enabled: true,
          },
          create: {
            tenantId: tenant.id,
            githubInstallationId: installationId,
            githubRepoId: String(repo.id),
            owner: repo.owner.login,
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch || "main",
            enabled: true,
          },
        });
      } catch (e) {
        console.error("Repo upsert error:", e);
      }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error: any) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/install?error=1", req.url));
  }
}
