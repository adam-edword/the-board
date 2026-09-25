"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

// espn serves a dark-background version of every logo under /500-dark/.
// the nfl "scoreboard" variants are huge, so use the plain dark logo instead.
function darkLogo(src: string) {
  return src.replace(/\/teamlogos\/(nfl|ncaa)\/500\/(scoreboard\/)?/, "/teamlogos/$1/500-dark/");
}

export function TeamLogo({ src, size = 32 }: { src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src) return <span style={{ width: size, height: size }} className="inline-block shrink-0 rounded-full bg-muted" />;
  return (
    <img
      src={failed ? src : darkLogo(src)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
