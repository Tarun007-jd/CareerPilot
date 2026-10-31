import { Badge } from "@/components/ui/badge";
import type {
  ApplicationStatus,
  GapClassification,
  ProjectStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const applicationStyles: Record<
  ApplicationStatus,
  { variant: "outline" | "info" | "warning" | "success" | "danger" | "default"; className?: string }
> = {
  Interested: { variant: "outline" },
  Applied: { variant: "info" },
  Assessment: { variant: "warning" },
  Interview: { variant: "default" },
  Rejected: { variant: "danger" },
  Offer: { variant: "success" },
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const style = applicationStyles[status];
  return (
    <Badge variant={style.variant} className={className}>
      {status}
    </Badge>
  );
}

const gapLabels: Record<GapClassification, string> = {
  strong: "Strong match",
  partial: "Partial match",
  missing: "Missing",
  "needs-improvement": "Needs improvement",
};

export function GapStatusBadge({
  classification,
  className,
}: {
  classification: GapClassification;
  className?: string;
}) {
  return (
    <Badge variant={classification} className={className}>
      {gapLabels[classification]}
    </Badge>
  );
}

const projectLabels: Record<ProjectStatus, string> = {
  recommended: "Recommended",
  saved: "Saved",
  in_progress: "In progress",
  completed: "Completed",
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const variant =
    status === "completed"
      ? "success"
      : status === "in_progress"
        ? "info"
        : status === "saved"
          ? "default"
          : "outline";
  return (
    <Badge variant={variant} className={className}>
      {projectLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        priority === "high" && "border-rose-100 bg-rose-50 text-rose-700",
        priority === "medium" && "border-amber-100 bg-amber-50 text-amber-700",
        priority === "low" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {priority} priority
    </Badge>
  );
}
