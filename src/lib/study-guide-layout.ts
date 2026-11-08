export type GuideRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type Point = { x: number; y: number };
type GuideEntry = {
  id: string;
  target: GuideRect;
  note: { width: number; height: number };
};
export type GuidePlacement = {
  id: string;
  label: GuideRect;
  from: Point;
  to: Point;
};

const GAP = 12;
const right = (rect: GuideRect) => rect.left + rect.width;
const bottom = (rect: GuideRect) => rect.top + rect.height;
const center = (rect: GuideRect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const area = (a: GuideRect, b: GuideRect) =>
  Math.max(0, Math.min(right(a), right(b)) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(a.top, b.top));
const expand = (rect: GuideRect, gap: number): GuideRect => ({
  left: rect.left - gap,
  top: rect.top - gap,
  width: rect.width + 2 * gap,
  height: rect.height + 2 * gap,
});

function validateRect(rect: GuideRect) {
  if (
    ![
      rect.left,
      rect.top,
      rect.width,
      rect.height,
      right(rect),
      bottom(rect),
    ].every(Number.isFinite) ||
    rect.width < 0 ||
    rect.height < 0
  )
    throw new RangeError(
      "Guide rectangles need finite coordinates and nonnegative dimensions",
    );
}

// Intersect the center-to-center line with a rectangle's border, so arrows
// meet the highlighted control and label edges rather than covering their text.
function border(rect: GuideRect, toward: Point): Point {
  const c = center(rect);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y || (dx === 0 ? 1 : 0);
  const scale = Math.min(
    dx ? rect.width / 2 / Math.abs(dx) : Infinity,
    dy ? rect.height / 2 / Math.abs(dy) : Infinity,
  );
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

/** Place the four short notes in caller order (day, progress, share, next).
 * Notes are clamped to the viewport's 12px gutter; callers must honor the
 * returned width/height with max-height/overflow for oversized measured text.
 * Reserved rectangles (for example, the dismiss hint) are obstacles only;
 * they do not create spotlights or output placements.
 * Prefer no overlap, then proximity. Crowded screens retain bounded notes with
 * the smallest collision score. Off-screen target coordinates are allowed.
 */
export function layoutStudyGuide(
  viewport: { width: number; height: number },
  entries: GuideEntry[],
  reserved: GuideRect[] = [],
): GuidePlacement[] {
  if (
    ![viewport.width, viewport.height].every(Number.isFinite) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  )
    throw new RangeError(
      "Guide viewport dimensions must be finite and positive",
    );
  for (const entry of entries) {
    validateRect(entry.target);
    if (
      ![entry.note.width, entry.note.height].every(Number.isFinite) ||
      entry.note.width <= 0 ||
      entry.note.height <= 0
    )
      throw new RangeError("Guide notes need finite positive dimensions");
  }
  for (const rect of reserved) validateRect(rect);
  // Keep even an unusually tiny viewport bounded; normal screens use 12px.
  const gutter = Math.min(GAP, viewport.width / 4, viewport.height / 4);
  const result: GuidePlacement[] = [];
  for (const entry of entries) {
    const width = Math.min(entry.note.width, viewport.width - 2 * gutter);
    const height = Math.min(entry.note.height, viewport.height - 2 * gutter);
    const c = center(entry.target);
    const obstacles = [
      ...entries.map((item) => item.target),
      ...reserved,
      ...result.map((item) => item.label),
    ];
    const xs = new Set([
      gutter,
      viewport.width - gutter - width,
      c.x - width / 2,
      entry.target.left,
      right(entry.target) - width,
    ]);
    const ys = new Set([
      gutter,
      viewport.height - gutter - height,
      c.y - height / 2,
      entry.target.top,
      bottom(entry.target) - height,
    ]);
    for (const obstacle of obstacles) {
      xs.add(obstacle.left - width - GAP);
      xs.add(right(obstacle) + GAP);
      ys.add(obstacle.top - height - GAP);
      ys.add(bottom(obstacle) + GAP);
    }
    let best:
      { label: GuideRect; overlap: number; distance: number } | undefined;
    for (const x of xs)
      for (const y of ys) {
        const label = {
          left: clamp(x, gutter, viewport.width - gutter - width),
          top: clamp(y, gutter, viewport.height - gutter - height),
          width,
          height,
        };
        const overlap =
          entries.reduce(
            (sum, item) => sum + 3 * area(label, expand(item.target, 4)),
            0,
          ) +
          reserved.reduce(
            (sum, rect) => sum + 3 * area(label, expand(rect, 4)),
            0,
          ) +
          result.reduce(
            (sum, item) => sum + area(label, expand(item.label, 8)),
            0,
          );
        const l = center(label);
        const distance =
          Math.hypot(
            Math.max(
              entry.target.left - right(label),
              label.left - right(entry.target),
              0,
            ),
            Math.max(
              entry.target.top - bottom(label),
              label.top - bottom(entry.target),
              0,
            ),
          ) +
          0.1 * Math.hypot(l.x - c.x, l.y - c.y);
        if (
          !best ||
          overlap < best.overlap ||
          (overlap === best.overlap && distance < best.distance)
        )
          best = { label, overlap, distance };
      }
    const label = best!.label;
    result.push({
      id: entry.id,
      label,
      from: border(label, c),
      to: border(entry.target, center(label)),
    });
  }
  return result;
}
