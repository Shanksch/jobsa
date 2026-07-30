import * as React from "react";
import { cn } from "../lib/utils.js";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent relative overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
