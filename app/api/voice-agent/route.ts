import { NextRequest, NextResponse } from "next/server";
import { voiceAgentRequestSchema } from "@/lib/schemas";
import { processVoiceCommand } from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: NextRequest) {
  try {
    const input = voiceAgentRequestSchema.parse(await request.json());
    const result = await processVoiceCommand(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
