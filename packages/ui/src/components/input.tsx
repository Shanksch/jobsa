import * as React from "react";

import { cn } from "../lib/utils.js";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | React.ReactNode | any;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-foreground leading-none">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive">
            {typeof error === "string" || React.isValidElement(error)
              ? error
              : String(error?.message || error || "")}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
