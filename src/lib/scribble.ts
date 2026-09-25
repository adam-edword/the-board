// deterministic "hand drawn" randomness so every tile looks a little different
// but the same tile renders identically on the server and in the browser.

export function rng(seed: number) {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** random number in [-amount, amount] */
export function jitter(r: () => number, amount: number) {
  return (r() * 2 - 1) * amount;
}

/**
 * a slightly wobbly marker stroke across a 100x100 viewbox, either
 * top-to-bottom (vertical) or left-to-right. meant for svg with
 * preserveAspectRatio="none" so it stretches to fit.
 */
export function wobblyLine(r: () => number, vertical: boolean, wobble = 1.6) {
  const steps = 5;
  const start = 50 + jitter(r, wobble);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const along = 2 + (96 * i) / steps + (i > 0 && i < steps ? jitter(r, 3) : 0);
    const across = start + jitter(r, wobble) + (i / steps) * jitter(r, wobble);
    pts.push(vertical ? [across, along] : [along, across]);
  }
  // smooth it out with quadratic curves through the midpoints
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  return d;
}
