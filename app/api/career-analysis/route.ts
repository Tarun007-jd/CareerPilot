import { NextRequest, NextResponse } from "next/server";
import { careerAnalysisRequestSchema } from "@/lib/schemas";
import {
  analyzeResume,
  analyzeSkillGap,
  extractJobDescription,
  generateApplicationInsights,
} from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = careerAnalysisRequestSchema.parse(body);

    if (input.action === "resume") {
      const result = await analyzeResume(input.resumeText);
      return NextResponse.json({
        action: "resume",
        extraction: result.extraction,
        engine: result.engine,
      });
    }

    if (input.action === "job-description") {
      const result = await extractJobDescription(
        input.jobDescription,
        input.companyHint,
      );
      return NextResponse.json({
        action: "job-description",
        jobTarget: result.jobTarget,
        extractionNote: result.extractionNote,
        engine: result.engine,
      });
    }

    if (input.action === "skill-gap") {
      const result = await analyzeSkillGap(input.profile, input.jobTarget);
      return NextResponse.json({
        action: "skill-gap",
        analysis: result.analysis,
        engine: result.engine,
      });
    }

    const result = await generateApplicationInsights(input.applications);
    return NextResponse.json({
      action: "application-insights",
      ...result,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
