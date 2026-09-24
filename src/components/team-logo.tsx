/* eslint-disable @next/next/no-img-element */
export function TeamLogo({ src, size = 32 }: { src: string | null; size?: number }) {
  if (!src) return <span style={{ width: size, height: size }} className="inline-block rounded-full bg-muted" />;
  return <img src={src} alt="" width={size} height={size} className="object-contain" loading="lazy" />;
}
