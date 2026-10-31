import { NextRequest, NextResponse } from "next/server";
import { projectsRequestSchema } from "@/lib/schemas";
import { recommendProjects } from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input = projectsRequestSchema.parse(await request.json());
    const result = await recommendProjects(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
