import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-card text-foreground border-border",
      destructive:
        "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
      warning:
        "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 dark:border-amber-500/40",
      success:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 dark:border-emerald-500/40",
    }[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-2xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
          variantClasses,
          className,
        )}
        {...props}
      />
    );
  },
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight text-sm",
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xs sm:text-sm [&_p]:leading-relaxed text-muted-foreground",
      className,
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
