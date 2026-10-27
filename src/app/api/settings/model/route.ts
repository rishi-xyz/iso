import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, modelId } = await req.json();
    
    try {
      await (db.orm.public as any).ModelConfig?.create?.({
        data: { id: "default", name: "default", provider: "nebius-token-factory", apiKey, modelId, enabled: true },
      });
    } catch (e) {
      try {
        await (db.orm.public as any).ModelConfig?.update?.({
          where: { id: "default" },
          data: { apiKey, modelId, enabled: true },
        });
      } catch (e2) {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
