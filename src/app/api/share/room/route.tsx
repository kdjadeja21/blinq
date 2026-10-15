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
  ogFredoka,
} from "../og-brand";

const MODE_LABEL = { individual: "Free-for-all", team: "Team battle" } as const;

export async function GET(request: NextRequest) {
  const room = await findOpenRoomByCode(
    request.nextUrl.searchParams.get("c") ?? "",
  );
  const hostName = room ? await findHostName(room) : "";
  const code = room?.code ?? "";
  const title = roomInviteMetaTitle(hostName);

  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 520,
        }}
      >
        <OgLockup />
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.ink,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.muted,
          }}
        >
          {room ? `${MODE_LABEL[room.mode]} · Tap to join` : "Tap to join"}
        </div>
      </div>
      {code ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.muted,
            }}
          >
            Room code
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {code.split("").map((ch, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 84,
                  height: 120,
                  borderRadius: 22,
                  background: COLORS.miss,
                  color: COLORS.bgFrom,
                  fontSize: 72,
                  fontWeight: 800,
                }}
              >
                {ch}
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
