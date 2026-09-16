import clsx from "clsx";

type Tone = "good" | "warn" | "bad" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  good: "bg-good/12 text-good",
  warn: "bg-warn/12 text-warn",
  bad: "bg-bad/12 text-bad",
  neutral: "bg-white/[0.06] text-ink-muted",
  accent: "bg-accent-muted text-accent",
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
