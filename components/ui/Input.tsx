"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-ink-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={clsx(
            "w-full rounded-control bg-white/[0.03] border border-base-border px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
            "focus:border-accent/60 focus:bg-white/[0.05] transition-colors duration-150",
            error && "border-bad/60",
            className
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[13px] text-bad">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-[13px] text-ink-faint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
