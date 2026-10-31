import { NextResponse } from "next/server";
import { getGeminiModel, isGeminiConfigured } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGeminiConfigured();
  return NextResponse.json(
    {
      configured,
      model: getGeminiModel(),
      mode: configured ? "gemini" : "local",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
