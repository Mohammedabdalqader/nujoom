/** SVG path helpers for the profile charts (pure, unit-tested). */

export type Point = { x: number; y: number };

/**
 * Monotone cubic interpolation (Fritsch–Carlson, the same curve Recharts' "monotone" draws):
 * smooth, and never overshoots the data between points.
 */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0]!.x},${points[0]!.y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1]!.x - points[i]!.x;
    slope[i] = (points[i + 1]!.y - points[i]!.y) / (dx[i] || 1);
  }
  const tangent: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent[i] =
      a * b <= 0
        ? 0
        : (3 * (dx[i - 1]! + dx[i]!)) /
          ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b);
  }
  tangent[n - 1] = slope[n - 2]!;

  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${p0.x + h},${p0.y + h * tangent[i]!} ${p1.x - h},${p1.y - h * tangent[i + 1]!} ${p1.x},${p1.y}`;
  }
  return d;
}

/** The area under a curve down to `baseline` (for the gradient fill). */
export function areaPath(points: readonly Point[], baseline: number): string {
  if (!points.length) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${monotonePath(points)} L${last.x},${baseline} L${first.x},${baseline} Z`;
}

/** A bar with rounded top corners (radius clamped to the bar size). */
export function roundedTopBar(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

/** Around four "nice" ticks covering [min, max] (1, 2, 2.5 or 5 × 10^n steps). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min];
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}
