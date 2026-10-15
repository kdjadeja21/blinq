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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic generated PNG, nothing to optimize */}
      <img
        src={`/api/share/daily?${imageQuery(params)}`}
        alt={`Remembered ${daily.correct} of ${daily.total} on ${when}`}
        width={1200}
        height={630}
        className="w-full rounded-3xl shadow-lg"
      />
      <h1 className="text-2xl font-bold">Can you beat it?</h1>
      <Link href="/" className={cn(buttonVariants({ variant: "game" }), "h-14 rounded-2xl px-8 text-lg")}>
        Play today&apos;s challenge
      </Link>
    </main>
  );
}
