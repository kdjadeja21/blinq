// sRGB values matching public/og.png; ImageResponse cannot render oklch tokens.
export const SHARE_COLORS = {
  bgFrom: "#2d1170",
  bgTo: "#6a1fa8",
  circleLarge: "rgba(120, 90, 220, 0.45)",
  circleSmall: "rgba(190, 70, 200, 0.45)",
  tileHitFace: "#ffffff",
  tileHitEdge: "#c9b8f5",
  tileMissFrom: "#8b3df0",
  tileMissTo: "#c340e8",
  tileMissBorder: "#c9b0ff",
  hitMark: "#2ecb70",
  missMark: "#ffffff",
  headline: "#ffffff",
  accent: "#ffd23f",
  starOff: "rgba(255, 255, 255, 0.25)",
  logoTile: "#6e28d9",
} as const;

export const SHARE_BACKGROUND = `linear-gradient(135deg, ${SHARE_COLORS.bgFrom}, ${SHARE_COLORS.bgTo})`;
export const SHARE_TILE_MISS_BACKGROUND = `linear-gradient(135deg, ${SHARE_COLORS.tileMissFrom}, ${SHARE_COLORS.tileMissTo})`;

export const SHARE_TILE_TILTS = [-6, 0, 6, 4, -4, 5, -5, 3, -3] as const;

export function tileTilt(index: number): number {
  return SHARE_TILE_TILTS[index % SHARE_TILE_TILTS.length];
}
