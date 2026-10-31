import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

function parseEyebrow(eyebrow?: string) {
  if (!eyebrow) return null;
  const match = eyebrow.match(/^Module\s+(\d+)\s*·\s*(.+)$/);
  if (!match) return { module: null, label: eyebrow };
  return { module: match[1], label: match[2] };
}

const moduleAccents: Record<string, { pill: string; bar: string }> = {
  "01": {
    pill: "border-indigo-100 bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
  },
  "02": {
    pill: "border-violet-100 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  "03": {
    pill: "border-sky-100 bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
  },
  "04": {
    pill: "border-emerald-100 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
  "05": {
    pill: "border-amber-100 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  "06": {
    pill: "border-rose-100 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  },
  "07": {
    pill: "border-indigo-100 bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
  },
  "08": {
    pill: "border-sky-100 bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
  },
  "09": {
    pill: "border-violet-100 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  "10": {
    pill: "border-slate-200 bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
  },
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const parsed = parseEyebrow(eyebrow);
  const accent = parsed?.module ? moduleAccents[parsed.module] : undefined;
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {parsed ? (
          <div className="mb-2.5 flex items-center gap-2.5">
            {parsed.module && accent ? (
              <span
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold tabular-nums shadow-sm",
                  accent.pill,
                )}
              >
                {parsed.module}
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {parsed.label}
            </span>
          </div>
        ) : null}
        <div className="flex items-start gap-3">
          {accent ? (
            <span
              aria-hidden="true"
              className={cn(
                "mt-2 h-9 w-[3px] shrink-0 rounded-full",
                accent.bar,
              )}
            />
          ) : null}
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-[32px]">
            {title}
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
