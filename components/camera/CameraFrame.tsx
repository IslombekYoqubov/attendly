"use client";

import { RefObject } from "react";
import clsx from "clsx";

type GuideState = "idle" | "searching" | "detected" | "success" | "warning";

const ringClasses: Record<GuideState, string> = {
  idle: "border-white/15",
  searching: "border-white/25",
  detected: "border-accent/70",
  success: "border-good",
  warning: "border-warn",
};

export function CameraFrame({
  videoRef,
  guideState = "idle",
  overlayLabel,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  guideState?: GuideState;
  overlayLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-square max-w-md mx-auto rounded-card overflow-hidden bg-black border border-base-border">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />

      {/* Face guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={clsx(
            "w-[62%] aspect-[3/4] rounded-[40%] border-2 transition-colors duration-300",
            ringClasses[guideState],
            guideState === "searching" && "animate-scan-pulse"
          )}
        />
      </div>

      {overlayLabel && (
        <div className="absolute bottom-4 inset-x-4 flex justify-center">
          <span className="glass rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink">
            {overlayLabel}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
