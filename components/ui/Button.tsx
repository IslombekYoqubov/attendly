"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent/90 backdrop-blur-md text-white border border-accent/40 hover:bg-accent disabled:bg-accent/40",
  secondary:
    "glass text-ink hover:bg-white/[0.09] disabled:opacity-40",
  ghost: "text-ink-muted hover:text-ink hover:bg-white/[0.06] backdrop-blur-sm disabled:opacity-40",
  danger: "bg-bad/80 backdrop-blur-md text-white border border-bad/40 hover:bg-bad disabled:bg-bad/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-sm px-5 py-2.5 gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center rounded-control font-medium transition-colors duration-150 disabled:cursor-not-allowed select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
