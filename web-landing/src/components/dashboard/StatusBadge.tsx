export type Tone = "navy" | "teal" | "green" | "amber" | "red" | "violet" | "gray" | "blue";

export default function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`sbadge sb-${tone}`}>{label}</span>;
}
