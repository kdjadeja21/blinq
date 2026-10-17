import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — Blinq",
  description: "Blinq is a memory game: memorize items on a grid, then pick them out of a crowd. Play solo or battle friends.",
  alternates: { canonical: "/about" },
};

const sections: LegalSection[] = [
  {
    id: "what",
    title: "What is Blinq?",
    body: (
      <p>
        Blinq is a memory game. You memorize items on a grid, then pick them back out of a crowd under time pressure.
        Rounds are short, so it fits in a spare minute. Our idea is simple: {SITE.tagline.toLowerCase()}.
      </p>
    ),
  },
  {
    id: "modes",
    title: "How you can play",
    body: (
      <ul>
        <li>
          <strong>Levels:</strong> solo rounds that get harder as you progress. Guests can play up to level{" "}
          {SITE.guestMaxLevel}. Sign in to unlock more.
        </li>
        <li>
          <strong>Daily challenge:</strong> one table for everyone each day and one attempt. Sign in to play and appear
          on the <Link href="/leaderboard">leaderboard</Link>.
        </li>
        <li>
          <strong>Practice and memory test:</strong> a practice round to learn the game, and a one-minute memory check you
          can retake to see how your accuracy changes.
        </li>
        <li>
          <strong>Multiplayer:</strong> create a room and share its code or link. Play in teams or on your own, up to{" "}
          {SITE.maxPlayersTeam} players in team mode and {SITE.maxPlayersIndividual} in individual mode. No account is
          needed.
        </li>
      </ul>
    ),
  },
  {
    id: "app",
    title: "Works like an app",
    body: (
      <p>
        Blinq runs in your browser and can be installed to your home screen. See <Link href="/install">how to install</Link>.
        An internet connection is needed to play.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Your data and fair play",
    body: (
      <>
        <p>
          We collect only what the game needs, and we do not run ads or sell personal data. Read the details in our{" "}
          <Link href="/privacy">Privacy Policy</Link> and the rules for playing in our <Link href="/terms">Terms</Link>.
        </p>
        <p>
          Blinq is made for fun. It is not a medical tool and does not promise to improve memory or treat any condition.
        </p>
      </>
    ),
  },
  {
    id: "who",
    title: "Who makes it",
    body: (
      <p>
        Blinq is built and operated by {SITE.operator} in {SITE.operatorCountry}. Reach us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    ),
  },
];

export default function AboutPage() {
  return (
    <LegalPage
      title={`About ${SITE.name}`}
      intro={<p>{SITE.tagline}.</p>}
      sections={sections}
    />
  );
}
