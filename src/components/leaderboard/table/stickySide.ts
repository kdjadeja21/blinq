export type StickySide = "top" | "bottom";

const FULLY_VISIBLE = 0.99;

/** Which edge the viewer's pinned copy belongs on, or null while the real row is fully visible. */
export function stickySide(intersectionRatio: number, rowTop: number, rootTop: number): StickySide | null {
  if (intersectionRatio >= FULLY_VISIBLE) return null;
  return rowTop < rootTop ? "top" : "bottom";
}
