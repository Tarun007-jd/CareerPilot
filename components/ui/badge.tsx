import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-accent text-accent-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-muted-foreground",
        success: "border-emerald-100 bg-emerald-50 text-emerald-700",
        warning: "border-amber-100 bg-amber-50 text-amber-700",
        danger: "border-rose-100 bg-rose-50 text-rose-700",
        info: "border-sky-100 bg-sky-50 text-sky-700",
        strong: "border-emerald-100 bg-emerald-50 text-emerald-700",
        partial: "border-sky-100 bg-sky-50 text-sky-700",
        missing: "border-rose-100 bg-rose-50 text-rose-700",
        "needs-improvement": "border-amber-100 bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
