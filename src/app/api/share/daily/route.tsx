import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { formatDailyDate } from "@/lib/progress";
import { parseSharedDaily } from "@/lib/share-params";
import {
  OG_COLORS as COLORS,
  OG_HEIGHT as HEIGHT,
  OG_WIDTH as WIDTH,
  OgFrame,
  OgLockup,
  ogFredoka as fredoka,
} from "../og-brand";

const COLS = 4;
const CELL = 84;
const GAP = 14;

const STAR_POINTS = "50,5 63,36 97,38 71,59 80,92 50,73 20,92 29,59 3,38 37,36";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const daily = parseSharedDaily((key) => searchParams.get(key));
  const label = daily.date ? formatDailyDate(daily.date) : "Daily Challenge";
  const cells =
    daily.grid.length > 0
      ? daily.grid
      : Array.from({ length: daily.total }, (_, i) => i < daily.correct);

  const rows: boolean[][] = [];
  for (let i = 0; i < cells.length; i += COLS)
    rows.push(cells.slice(i, i + COLS));

  return new ImageResponse(
    <OgFrame>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <OgLockup />
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            color: COLORS.muted,
          }}
        >
          {`Daily Challenge · ${label}`}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <svg key={i} width="84" height="84" viewBox="0 0 100 100">
              <polygon
                points={STAR_POINTS}
                fill={i < daily.stars ? COLORS.gold : COLORS.goldOff}
                stroke={i < daily.stars ? COLORS.gold : COLORS.goldOff}
                strokeWidth="6"
                strokeLinejoin="round"
              />
            </svg>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            color: COLORS.ink,
          }}
        >
          <div
            style={{ display: "flex", fontSize: 120, fontWeight: 800 }}
          >{`${daily.correct}/${daily.total}`}</div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
            remembered
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.bgFrom,
          }}
        >
          Can you beat me?
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
                  width: CELL,
                  height: CELL,
                  borderRadius: 22,
                  background: hit ? COLORS.success : COLORS.miss,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </OgFrame>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Fredoka", data: await fredoka, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
