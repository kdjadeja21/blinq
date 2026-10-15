import { Star } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatDailyDate } from "@/lib/progress";
import { parseSharedDaily } from "@/lib/share-params";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function toDaily(searchParams: SearchParams) {
  return parseSharedDaily((key) => {
    const value = searchParams[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  });
}

function imageQuery(searchParams: SearchParams): string {
  const daily = toDaily(searchParams);
  return new URLSearchParams({
    d: daily.date,
    c: String(daily.correct),
    t: String(daily.total),
    s: String(daily.stars),
    g: daily.grid.map((hit) => (hit ? "1" : "0")).join(""),
  }).toString();
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const params = await searchParams;
  const daily = toDaily(params);
  const when = daily.date ? formatDailyDate(daily.date) : "today";
  const title = `I remembered ${daily.correct}/${daily.total} on Blinq's daily challenge`;
  const description = `Daily Challenge · ${when}. Think you can beat me? Play Blinq.`;
  const host = (await headers()).get("host");
  const proto = host?.startsWith("localhost") ? "http" : "https";
  const image = `${host ? `${proto}://${host}` : ""}/api/share/daily?${imageQuery(params)}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedDailyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const daily = toDaily(params);
  const when = daily.date ? formatDailyDate(daily.date) : "today";

  const cells = daily.grid.length > 0 ? daily.grid : Array.from({ length: daily.total }, (_, i) => i < daily.correct);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <section
        aria-label={`Remembered ${daily.correct} of ${daily.total} on ${when}`}
        className="w-full rounded-[2rem] bg-gradient-to-br from-primary to-fuchsia-500 p-3 shadow-lg"
      >
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-6">
          <div className="flex items-center gap-2">
            <span className="text-4xl motion-safe:animate-bounce" aria-hidden>
              🧠
            </span>
            <p className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
              Blinq
            </p>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Daily Challenge · {when}</p>
          <div className="flex gap-1" role="img" aria-label={`${daily.stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={cn("size-10", i < daily.stars ? "fill-gold text-gold" : "text-muted-foreground/40")}
              />
            ))}
          </div>
          <p className="flex items-baseline gap-2">
            <span className="text-6xl font-extrabold">
              {daily.correct}/{daily.total}
            </span>
            <span className="font-semibold">remembered</span>
          </p>
          <div className="grid grid-cols-4 gap-2" aria-hidden>
            {cells.map((hit, i) => (
              <span key={i} className={cn("size-10 rounded-xl", hit ? "bg-success" : "bg-muted")} />
            ))}
          </div>
        </div>
      </section>
      <h1 className="text-2xl font-bold">Can you beat it?</h1>
      <Link href="/" className={cn(buttonVariants({ variant: "game" }), "h-14 rounded-2xl px-8 text-lg")}>
        Play today&apos;s challenge
      </Link>
    </main>
  );
}
