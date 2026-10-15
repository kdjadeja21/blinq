import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blinq — memory game",
  description: "Memorize the table. Recall it against the clock. Come back tomorrow for a new one.",
  metadataBase: new URL("https://blinqplay.vercel.app"),
  openGraph: {
    title: "Blinq — memory game",
    description: "Memorize the table. Recall it against the clock. Come back tomorrow for a new one.",
    url: "/",
    siteName: "Blinq",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Blinq — Memorize the table. Recall it against the clock." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blinq — memory game",
    description: "Memorize the table. Recall it against the clock. Come back tomorrow for a new one.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("blinq:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <div className="game-bg" aria-hidden />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
