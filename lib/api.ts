import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AIServiceError } from "./gemini";

export function apiErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: first
            ? `${first.path.join(".") || "Request"}: ${first.message}`
            : "The request did not pass validation.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
          retryable: false,
        },
      },
      { status: 400 },
    );
  }
  if (error instanceof AIServiceError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      },
      { status: error.status },
    );
  }
  const record =
    error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const message = String(record.message ?? "");
  if (
    message.includes("Unexpected end") ||
    message.includes("FormData") ||
    message.includes("multipart")
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_UPLOAD",
          message: "The uploaded file could not be read. Try a different PDF.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message:
          "Something went wrong while processing this request. No result was saved.",
        retryable: true,
      },
    },
    { status: 500 },
  );
}
