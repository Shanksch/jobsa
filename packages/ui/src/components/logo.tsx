import * as React from "react";
import { cn } from "../lib/utils.js";

export function Logo({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/logo.png"
      alt="JobSA Logo"
      className={cn("size-8 object-contain scale-[2] transform", className)}
      {...props}
      onError={(e) => {
        // Hide the broken image icon if logo.png doesn't exist yet
        e.currentTarget.style.display = 'none';
        
        // Find the parent and add a sleek fallback icon
        const parent = e.currentTarget.parentElement;
        if (parent && !parent.querySelector('.fallback-icon')) {
          const fallback = document.createElement('div');
          fallback.className = cn("fallback-icon flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold", className);
          fallback.innerHTML = "J";
          parent.appendChild(fallback);
        }
      }}
    />
  );
}
