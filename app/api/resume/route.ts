import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeResume } from "@/lib/career-engine";
import { apiErrorResponse } from "@/lib/api";
import { AIServiceError } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const textRequestSchema = z.object({
  text: z.string().trim().min(40, "Add more resume text.").max(120000),
});

async function parsePdf(buffer: Buffer) {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule.default ?? pdfModule) as (data: Buffer) => Promise<{
    text: string;
    numpages?: number;
  }>;
  return pdfParse(buffer);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let resumeText = "";
    let fileName = "pasted-resume.txt";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new AIServiceError("Attach a PDF resume before parsing.", {
          status: 400,
          code: "MISSING_RESUME_FILE",
        });
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new AIServiceError(
          "Resume PDFs must be 5 MB or smaller.",
          { status: 400, code: "RESUME_TOO_LARGE" },
        );
      }
      fileName = file.name || "resume.pdf";
      const buffer = Buffer.from(await file.arrayBuffer());
      if (
        file.type === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf")
      ) {
        if (!buffer.subarray(0, 5).toString().includes("%PDF")) {
          throw new AIServiceError("This file does not look like a valid PDF.", {
            status: 400,
            code: "INVALID_PDF",
          });
        }
        const parsed = await parsePdf(buffer);
        resumeText = parsed.text ?? "";
        if (!resumeText.trim()) {
          throw new AIServiceError(
            "No selectable text was found in this PDF. Export a text-based PDF instead of a scanned image.",
            { status: 422, code: "EMPTY_PDF_TEXT" },
          );
        }
      } else if (
        file.type === "text/plain" ||
        fileName.toLowerCase().endsWith(".txt") ||
        fileName.toLowerCase().endsWith(".md")
      ) {
        resumeText = await file.text();
      } else {
        throw new AIServiceError("Upload a PDF or plain-text resume.", {
          status: 400,
          code: "UNSUPPORTED_RESUME_TYPE",
        });
      }
    } else {
      const body = await request.json();
      const input = textRequestSchema.parse(body);
      resumeText = input.text;
    }

    resumeText = resumeText
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
      .slice(0, 80000);
    if (resumeText.length < 40) {
      throw new AIServiceError(
        "The resume text is too short to analyze. Add more detail.",
        { status: 400, code: "RESUME_TOO_SHORT" },
      );
    }

    const { extraction, engine } = await analyzeResume(resumeText);
    return NextResponse.json({
      text: resumeText,
      fileName,
      extraction,
      engine,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
