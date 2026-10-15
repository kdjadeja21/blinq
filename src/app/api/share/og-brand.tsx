import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// ImageResponse cannot render oklch tokens, so the palette is the sRGB equivalent of the theme.
export const OG_COLORS = {
  brandFrom: "#6e28d9",
  brandTo: "#d946ef",
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

export const ogFredoka = readFile(
  join(process.cwd(), "src/app/api/share/daily/Fredoka-Bold.ttf"),
);

export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${OG_COLORS.bgFrom}, ${OG_COLORS.bgTo})`,
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
          background: OG_COLORS.card,
          borderRadius: 48,
          padding: "0 72px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function OgLockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <svg width="72" height="72" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="8" fill="#6E28D9" />
        <path
          fill="#fff"
          d="M16 7.2c-1.2 0-2.2.5-2.9 1.3A4.1 4.1 0 0 0 9.4 7a4.3 4.3 0 0 0-4.2 5.1 3.7 3.7 0 0 0 .2 6.2A4 4 0 0 0 9 22.6V24a1.2 1.2 0 0 0 1.2 1.2h4.2V7.2H16zM16 7.2c1.2 0 2.2.5 2.9 1.3A4.1 4.1 0 0 1 22.6 7a4.3 4.3 0 0 1 4.2 5.1 3.7 3.7 0 0 1-.2 6.2A4 4 0 0 1 23 22.6V24a1.2 1.2 0 0 1-1.2 1.2H16V7.2z"
        />
        <path
          d="M16 9.2v14.2"
          stroke="#6E28D9"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 800,
          color: "transparent",
          backgroundImage: `linear-gradient(90deg, ${OG_COLORS.brandFrom}, ${OG_COLORS.brandTo})`,
          backgroundSize: "170% 100%",
          backgroundPosition: "center",
          backgroundClip: "text",
        }}
      >
        Blinq
      </div>
    </div>
  );
}
