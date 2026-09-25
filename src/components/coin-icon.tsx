import { cn } from "@/lib/utils";

// a little hand-drawn coin for the coin-flip player. slightly lopsided on purpose.
export function CoinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="coin"
      style={style}
      className={cn("inline-block size-[1.1em] shrink-0 align-[-0.2em]", className)}
    >
      <path
        d="M12.3 2.4c5.3.1 9.4 4.3 9.2 9.7-.2 5.2-4.4 9.6-9.8 9.5-5.3-.1-9.4-4.6-9.3-9.8.1-5.1 4.6-9.5 9.9-9.4z"
        fill="#facc15"
        fillOpacity={0.22}
        stroke="#facc15"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.1 5.6c3.6 0 6.3 2.9 6.2 6.5-.1 3.5-2.9 6.3-6.4 6.2-3.5-.1-6.1-3-6-6.4.1-3.5 2.8-6.3 6.2-6.3z"
        fill="none"
        stroke="#facc15"
        strokeWidth={1.1}
        strokeDasharray="2.2 1.6"
        strokeLinecap="round"
        opacity={0.8}
      />
      <path
        d="M14.6 9.4c-.6-.9-1.6-1.4-2.7-1.3-1.9.2-3.1 1.9-3 3.9.1 2 1.6 3.6 3.4 3.5 1.1 0 2-.6 2.5-1.4"
        fill="none"
        stroke="#facc15"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </svg>
  );
}
