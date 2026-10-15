import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { formatDailyDate } from "@/lib/progress";
import { parseSharedDaily } from "@/lib/share-params";

const WIDTH = 1200;
const HEIGHT = 630;
const COLS = 4;
const CELL = 84;
const GAP = 14;

const STAR_POINTS = "50,5 63,36 97,38 71,59 80,92 50,73 20,92 29,59 3,38 37,36";

// ImageResponse cannot render oklch tokens, so the palette is the sRGB equivalent of the theme.
const COLORS = {
  bgFrom: "#5b2bd6",
  bgTo: "#c13fd8",
  card: "#ffffff",
  ink: "#2a1a63",
  muted: "#7a6bb0",
  success: "#2ecb70",
  miss: "#e4defa",
  gold: "#ffc531",
  goldOff: "#ddd5f5",
};

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const daily = parseSharedDaily((key) => searchParams.get(key));
  const label = daily.date ? formatDailyDate(daily.date) : "Daily Challenge";
  const cells = daily.grid.length > 0 ? daily.grid : Array.from({ length: daily.total }, (_, i) => i < daily.correct);

  const rows: boolean[][] = [];
  for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${COLORS.bgFrom}, ${COLORS.bgTo})`,
          padding: 48,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: COLORS.card,
            borderRadius: 48,
            padding: "0 72px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <svg width="72" height="72" viewBox="0 0 32 32">
                <rect width="32" height="32" rx="8" fill="#6E28D9" />
                <path
                  fill="#fff"
                  d="M16 7.2c-1.2 0-2.2.5-2.9 1.3A4.1 4.1 0 0 0 9.4 7a4.3 4.3 0 0 0-4.2 5.1 3.7 3.7 0 0 0 .2 6.2A4 4 0 0 0 9 22.6V24a1.2 1.2 0 0 0 1.2 1.2h4.2V7.2H16zM16 7.2c1.2 0 2.2.5 2.9 1.3A4.1 4.1 0 0 1 22.6 7a4.3 4.3 0 0 1 4.2 5.1 3.7 3.7 0 0 1-.2 6.2A4 4 0 0 1 23 22.6V24a1.2 1.2 0 0 1-1.2 1.2H16V7.2z"
                />
                <path d="M16 9.2v14.2" stroke="#6E28D9" strokeWidth="1.15" strokeLinecap="round" />
              </svg>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: COLORS.bgFrom }}>Blinq</div>
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: COLORS.muted }}>
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, color: COLORS.ink }}>
              <div style={{ display: "flex", fontSize: 120, fontWeight: 800 }}>{`${daily.correct}/${daily.total}`}</div>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>remembered</div>
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: COLORS.bgFrom }}>
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
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
