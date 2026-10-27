import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, modelId } = await req.json();
    
    await prisma.modelConfig.upsert({
      where: { id: "default" },
      update: {
        apiKey,
        modelId,
        enabled: true,
      },
      create: {
        id: "default",
        name: "default",
        provider: "nebius-token-factory",
        apiKey,
        modelId,
        enabled: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
