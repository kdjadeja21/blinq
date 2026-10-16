import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { formatDailyDate } from "@/lib/progress";
import { parseSharedDaily } from "@/lib/share-params";
import { SHARE_BACKGROUND, SHARE_COLORS, SHARE_TILE_MISS_BACKGROUND, tileTilt } from "@/lib/share-design";

const WIDTH = 1200;
const HEIGHT = 630;
const COLS = 4;
const CELL = 92;
const GAP = 16;

const STAR_POINTS = "50,5 63,36 97,38 71,59 80,92 50,73 20,92 29,59 3,38 37,36";


const fredoka = readFile(join(process.cwd(), "src/app/api/share/daily/Fredoka-Bold.ttf"));

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const daily = parseSharedDaily((key) => searchParams.get(key));
  const label = daily.date ? formatDailyDate(daily.date) : "Daily Challenge";
  const cells = daily.grid.length > 0 ? daily.grid : Array.from({ length: daily.total }, (_, i) => i < daily.correct);

  const rows: boolean[][] = [];
  for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));

  const cell = rows.length > 3 ? 68 : CELL;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          background: SHARE_BACKGROUND,
          padding: "0 80px",
          fontFamily: "Fredoka",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -140,
            top: -200,
            width: 640,
            height: 640,
            borderRadius: 320,
            background: SHARE_COLORS.circleLarge,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -220,
            width: 520,
            height: 520,
            borderRadius: 260,
            background: SHARE_COLORS.circleSmall,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="96" height="96" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill={SHARE_COLORS.logoTile} />
              <path
                fill="#fff"
                d="M16 7.2c-1.2 0-2.2.5-2.9 1.3A4.1 4.1 0 0 0 9.4 7a4.3 4.3 0 0 0-4.2 5.1 3.7 3.7 0 0 0 .2 6.2A4 4 0 0 0 9 22.6V24a1.2 1.2 0 0 0 1.2 1.2h4.2V7.2H16zM16 7.2c1.2 0 2.2.5 2.9 1.3A4.1 4.1 0 0 1 22.6 7a4.3 4.3 0 0 1 4.2 5.1 3.7 3.7 0 0 1-.2 6.2A4 4 0 0 1 23 22.6V24a1.2 1.2 0 0 1-1.2 1.2H16V7.2z"
              />
              <path d="M16 9.2v14.2" stroke={SHARE_COLORS.logoTile} strokeWidth="1.15" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: SHARE_COLORS.headline }}>Blinq</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: SHARE_COLORS.headline }}>
              I remembered
            </div>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: SHARE_COLORS.headline }}>
              {`${daily.correct}/${daily.total}`}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: SHARE_COLORS.accent }}>
            {`Daily Challenge · ${label}`}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <svg key={i} width="56" height="56" viewBox="0 0 100 100">
                <polygon
                  points={STAR_POINTS}
                  fill={i < daily.stars ? SHARE_COLORS.accent : SHARE_COLORS.starOff}
                  stroke={i < daily.stars ? SHARE_COLORS.accent : SHARE_COLORS.starOff}
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
              </svg>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: GAP }}>
              {row.map((hit, c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: cell,
                    height: cell,
                    borderRadius: 22,
                    transform: `rotate(${tileTilt(r * COLS + c)}deg)`,
                    background: hit ? SHARE_COLORS.tileHitFace : SHARE_TILE_MISS_BACKGROUND,
                    border: hit ? "none" : `3px solid ${SHARE_COLORS.tileMissBorder}`,
                    borderBottom: `8px solid ${hit ? SHARE_COLORS.tileHitEdge : SHARE_COLORS.tileMissBorder}`,
                    color: SHARE_COLORS.missMark,
                    fontSize: cell * 0.5,
                    fontWeight: 700,
                  }}
                >
                  {hit ? (
                    <svg width={cell * 0.55} height={cell * 0.55} viewBox="0 0 24 24">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke={SHARE_COLORS.hitMark}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    "?"
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Fredoka", data: await fredoka, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
