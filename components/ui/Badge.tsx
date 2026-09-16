import clsx from "clsx";

type Tone = "good" | "warn" | "bad" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  good: "bg-good/[0.10] backdrop-blur-md border border-good/25 text-good",
  warn: "bg-warn/[0.10] backdrop-blur-md border border-warn/25 text-warn",
  bad: "bg-bad/[0.10] backdrop-blur-md border border-bad/25 text-bad",
  neutral: "bg-white/[0.05] backdrop-blur-md border border-white/[0.08] text-ink-muted",
  accent: "bg-accent/[0.12] backdrop-blur-md border border-accent/25 text-accent",
};

// Icons accompany color so status is never conveyed by color alone.
const toneGlyph: Record<Tone, string> = {
  good: "●",
  warn: "●",
  bad: "●",
  neutral: "○",
  accent: "●",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
        toneClasses[tone]
      )}
    >
      <span aria-hidden className="text-[8px]">
        {toneGlyph[tone]}
      </span>
      {children}
    </span>
  );
}
