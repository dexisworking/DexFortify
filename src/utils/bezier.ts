/**
 * Calculates a point along an SVG path string at a given progress (0 to 1).
 * Used for animating packets along curved ReactFlow edges.
 */
export function getBezierPoint(progress: number, path: string) {
  if (typeof document === "undefined") return { x: 0, y: 0 };

  try {
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", path);

    const length = pathEl.getTotalLength();
    const point = pathEl.getPointAtLength(progress * length);

    return { x: point.x, y: point.y };
  } catch (e) {
    // Fallback for invalid paths or environments
    console.error("Error calculating bezier point", e);
    return { x: 0, y: 0 };
  }
}
