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

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const parsed = parseEyebrow(eyebrow);
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
            {parsed.module ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums tracking-wide text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                {parsed.module}
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {parsed.label}
            </span>
          </div>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-[28px]">
          {title}
        </h1>
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
