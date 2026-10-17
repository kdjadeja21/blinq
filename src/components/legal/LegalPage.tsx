import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SITE } from "@/lib/site";

export type LegalSection = { id: string; title: string; body: ReactNode };

type LegalPageProps = {
  title: string;
  intro: ReactNode;
  updated?: string;
  sections: LegalSection[];
};

export function LegalFooterLinks() {
  return (
    <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-semibold text-muted-foreground">
      <Link href="/about" className="hover:text-foreground">About</Link>
      <Link href="/terms" className="hover:text-foreground">Terms</Link>
      <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
    </nav>
  );
}

export function LegalPage({ title, intro, updated, sections }: LegalPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to {SITE.name}
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          {title}
        </h1>
        {updated ? <p className="text-xs text-muted-foreground">Last updated: {updated}</p> : null}
        <div className="text-base text-muted-foreground">{intro}</div>
      </header>

      <nav aria-label="On this page" className="rounded-3xl border-2 bg-card p-4 shadow-lg">
        <h2 className="text-lg font-bold">Contents</h2>
        <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="font-semibold text-primary hover:underline">{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-4 rounded-3xl border-2 bg-card p-4 shadow-lg">
          <h2 id={`${s.id}-title`} className="text-xl font-bold">{s.title}</h2>
          <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed [&_a]:font-semibold [&_a]:text-primary [&_a:hover]:underline [&_li]:ml-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1">
            {s.body}
          </div>
        </section>
      ))}

      <footer className="mt-auto flex flex-col gap-2 pt-2">
        <LegalFooterLinks />
        <p className="text-center text-xs text-muted-foreground">
          Questions? Email <a href={`mailto:${SITE.contactEmail}`} className="font-semibold hover:text-foreground">{SITE.contactEmail}</a>
        </p>
      </footer>
    </main>
  );
}
