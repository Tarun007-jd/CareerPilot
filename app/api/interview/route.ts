import { NextRequest, NextResponse } from "next/server";
import { interviewRequestSchema } from "@/lib/schemas";
import {
  evaluateInterviewAnswer,
  generateInterviewQuestions,
  summarizeInterview,
} from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input = interviewRequestSchema.parse(await request.json());

    if (input.action === "generate") {
      const result = await generateInterviewQuestions({
        role: input.role,
        category: input.category,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        profile: input.profile,
        analysis: input.analysis ?? null,
      });
      return NextResponse.json({
        action: "generate",
        questions: result.questions.map((question, index) => ({
          id: `question_${Date.now()}_${index}`,
          question,
        })),
        engine: result.engine,
      });
    }

    if (input.action === "evaluate") {
      const result = await evaluateInterviewAnswer(input);
      return NextResponse.json({
        action: "evaluate",
        evaluation: result.evaluation,
        engine: result.engine,
      });
    }

    const result = await summarizeInterview(input.evaluations, input.role);
    return NextResponse.json({
      action: "summary",
      summary: result.summary,
      engine: result.engine,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
