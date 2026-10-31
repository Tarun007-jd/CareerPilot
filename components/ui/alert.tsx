import { cn } from "@/lib/utils";

const styles = {
  info: "border-sky-100 bg-sky-50/70 text-sky-950",
  warning: "border-amber-100 bg-amber-50/70 text-amber-950",
  success: "border-emerald-100 bg-emerald-50/70 text-emerald-950",
  error: "border-rose-100 bg-rose-50/70 text-rose-950",
  neutral: "border-border bg-muted/50 text-foreground",
};

const iconStyles = {
  info: "text-sky-600",
  warning: "text-amber-600",
  success: "text-emerald-600",
  error: "text-rose-600",
  neutral: "text-muted-foreground",
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof styles;
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
        styles[variant],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className={cn("mt-0.5 shrink-0", iconStyles[variant])}>{icon}</span>
      ) : null}
      <div className="min-w-0">
        {title ? (
          <p className="mb-0.5 font-semibold text-foreground">{title}</p>
        ) : null}
        <div className="text-foreground/75">{children}</div>
      </div>
    </div>
  );
}
