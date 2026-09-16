import clsx from "clsx";
import { HTMLAttributes } from "react";

export function Card({ className, glass = false, ...props }: HTMLAttributes<HTMLDivElement> & { glass?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-card p-5",
        glass ? "glass" : "bg-base-panel border border-base-border",
        className
      )}
      {...props}
    />
  );
}
