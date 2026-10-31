import { NextRequest, NextResponse } from "next/server";
import { roadmapRequestSchema } from "@/lib/schemas";
import { generateRoadmap } from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input = roadmapRequestSchema.parse(await request.json());
    const result = await generateRoadmap(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
