import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { roomInviteMetaTitle } from "@/lib/multiplayer/share";
import { findHostName, findOpenRoomByCode } from "@/server/multiplayer/queries";
import {
  OG_COLORS as COLORS,
  OG_HEIGHT,
  OG_WIDTH,
  OgFrame,
  OgLockup,
  OgSwords,
  ogFredoka,
} from "../og-brand";

const MODE_LABEL = { individual: "Free-for-all", team: "Team battle" } as const;
const HOST_MAX = 18;
const TILE_W = 96;
const TILE_GAP = 14;

function shortName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > HOST_MAX
    ? `${trimmed.slice(0, HOST_MAX - 1)}…`
    : trimmed;
}

export async function GET(request: NextRequest) {
  const room = await findOpenRoomByCode(
    request.nextUrl.searchParams.get("c") ?? "",
  );
  const hostName = room ? shortName(await findHostName(room)) : "";
  const code = room?.code ?? "";

  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <OgLockup />
          <OgSwords />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 58,
            fontWeight: 800,
            color: COLORS.ink,
            lineHeight: 1.1,
          }}
        >
          {roomInviteMetaTitle(hostName)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              color: COLORS.mutedStrong,
            }}
          >
            {room ? `${MODE_LABEL[room.mode]} · Tap to join` : "Tap to join"}
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 36px",
              borderRadius: 999,
              fontSize: 36,
              fontWeight: 800,
              color: "#ffffff",
              backgroundImage: `linear-gradient(90deg, ${COLORS.brandFrom}, ${COLORS.brandTo})`,
            }}
          >
            Join the battle
          </div>
        </div>
        {code ? (
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.mutedStrong,
              }}
            >
              Room code
            </div>
            <div style={{ display: "flex", gap: TILE_GAP }}>
              {code.split("").map((ch, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: TILE_W,
                    height: 110,
                    borderRadius: 22,
                    background: COLORS.miss,
                    color: COLORS.bgFrom,
                    fontSize: 68,
                    fontWeight: 800,
                  }}
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </OgFrame>,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        {
          name: "Fredoka",
          data: await ogFredoka,
          weight: 700,
          style: "normal",
        },
      ],
      headers: { "Cache-Control": "public, max-age=300" },
    },
  );
}
