import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — Blinq",
  description: "What data Blinq collects, why, who processes it, how long it is kept, and your choices.",
  alternates: { canonical: "/privacy" },
};

const storage = [
  { key: "blinq:v1, blinq:levels:v1, blinq:profiles:v1", use: "Guest progress, level progress and local player profiles on your device" },
  { key: "blinq:theme", use: "Your light or dark theme choice" },
  { key: "blinq:sound", use: "Your sound on/off choice" },
  { key: "blinq:install-dismissed:v1", use: "Remembers that you dismissed the install prompt" },
  { key: "blinq:supabase-auth", use: "Anonymous multiplayer session so you can stay in a room" },
];

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        {SITE.name} is operated by {SITE.operator}, {SITE.operatorCountry}, who decides how and why your personal data is
        used (the &quot;data fiduciary&quot; or &quot;controller&quot;). Contact us at{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          <strong>If you play as a guest,</strong> your progress stays in your browser&apos;s local storage. We do not
          receive it.
        </p>
        <p>
          <strong>If you sign in</strong> (through Clerk), we store for your account:
        </p>
        <ul>
          <li>your account ID from our sign-in provider, display name, profile picture URL and email address;</li>
          <li>game stats: level, best level, rounds played, wins, perfect rounds, correct and total items, wrong guesses, best score and streaks;</li>
          <li>each solo round you play: mode (level or daily), level, daily date, score, stars, correct answers, total and whether you won;</li>
          <li>your daily results and the accuracy of your memory test checks, with dates.</li>
        </ul>
        <p>
          Our database has an optional birth-year field reserved for the future. We do not currently ask for or collect
          it.
        </p>
        <p>
          <strong>If you play multiplayer,</strong> you use an anonymous session without an account. We store the
          nickname and avatar you choose, which room and team you are in, whether you are online, and your picks, timings
          and results in that room.
        </p>
        <p>
          <strong>Technical data.</strong> Our hosting and infrastructure providers may process technical information
          such as IP address, browser type and request logs to deliver and secure the Service. Vercel Analytics
          collects aggregated page-view and usage statistics. Vercel describes it as cookieless.
        </p>
        <p>
          We do not collect payment information, precise location, contacts, microphone or camera data. We do not run
          advertising and do not sell your personal data.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>to provide the game: save progress, run the daily challenge, run multiplayer rooms and show results;</li>
        <li>to show leaderboards and rankings;</li>
        <li>to sign you in and keep your account secure;</li>
        <li>to prevent abuse, cheating and offensive names;</li>
        <li>to understand usage and fix problems;</li>
        <li>to respond to your emails, and to meet legal obligations.</li>
      </ul>
    ),
  },
  {
    id: "public",
    title: "What other people can see",
    body: (
      <>
        <ul>
          <li>
            <strong>Leaderboard:</strong> anyone can see the display name, avatar and score totals of signed-in players,
            even without signing in.
          </li>
          <li>
            <strong>Multiplayer rooms:</strong> players in the same room see your nickname, avatar, team and results.
          </li>
        </ul>
        <p>Your email address is not shown to other players.</p>
      </>
    ),
  },
  {
    id: "processors",
    title: "Service providers",
    body: (
      <>
        <p>We share data only with providers that help us run Blinq, and only as needed:</p>
        <ul>
          <li><strong>Clerk</strong> for sign-in and account authentication;</li>
          <li><strong>Supabase</strong> for our database, anonymous multiplayer sessions and real-time room updates;</li>
          <li><strong>Vercel</strong> for hosting and Vercel Analytics.</li>
        </ul>
        <p>
          These providers may process data on servers outside India, so your data can be transferred internationally. We
          may also disclose information if required by law or to protect rights and safety.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "Local storage, cookies and offline cache",
    body: (
      <>
        <p>
          Blinq stores the following in your browser. We use these only to make the app work, not for advertising.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2">
                <th className="py-1 pr-3 font-bold">Key</th>
                <th className="py-1 font-bold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {storage.map((row) => (
                <tr key={row.key} className="border-b align-top">
                  <td className="py-1.5 pr-3 font-mono">{row.key}</td>
                  <td className="py-1.5">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Our sign-in provider may set its own cookies to keep you signed in. The app also uses a service worker that
          caches the offline page, icons and static files so it can load faster and work as an installable app. You can
          clear all of this in your browser settings, but you may lose guest progress.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <ul>
        <li>
          <strong>Account data</strong> is kept until you ask us to delete your account.
        </li>
        <li>
          <strong>Multiplayer rooms</strong> and their data (players, picks, results) are deleted automatically: hourly,
          rooms older than one hour with no human player seen in the last 15 minutes are removed, and every room is
          removed after 24 hours at most.
        </li>
        <li>
          <strong>Anonymous sessions</strong> contain no name or email. The session identifier may remain in our
          authentication system after your room is deleted.
        </li>
        <li>
          <strong>Server logs and analytics</strong> are kept by our providers under their own retention periods.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Account data in our database can be read and written only by our servers after you are signed in, and not directly
        from your browser. Connections use HTTPS. No online service is completely secure, so we cannot guarantee absolute
        security.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Accounts, leaderboards and multiplayer are for people aged {SITE.minAge}+. Under Indian law, people under{" "}
        {SITE.adultAge} need a parent or guardian&apos;s consent for their personal data to be processed, so if you are
        under {SITE.adultAge} please use these features only with a parent or guardian. We do not knowingly collect data
        from children under {SITE.minAge}. If you believe we have, email us and we will delete it. The app does not
        currently verify age.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    body: (
      <>
        <p>
          Subject to applicable law, including India&apos;s Digital Personal Data Protection Act, 2023, you can ask us to:
        </p>
        <ul>
          <li>give you a summary of the personal data we hold about you;</li>
          <li>correct or update inaccurate data;</li>
          <li>delete your account and its data;</li>
          <li>withdraw your consent, which may stop some features working.</li>
        </ul>
        <p>
          Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> from the address on your account. We may
          need to verify it is you. You can also play as a guest, up to level {SITE.guestMaxLevel}, without giving us any
          personal data. For complaints, contact us first. You may also approach the Data Protection Board of India once
          it is operational, or the regulator in your country.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    body: (
      <p>
        We do not take payments or collect card or bank details today. If we add paid features, payments will be handled
        by a third-party payment provider, and we will update this policy and our <Link href="/terms#paid">Terms</Link>{" "}
        before they launch.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as the app changes. The &quot;Last updated&quot; date above shows the latest version. We
        will give notice in the app or on this page when changes are significant.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Privacy questions or requests: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={SITE.legalUpdated}
      intro={<p>This policy explains what {SITE.name} collects, why, and the choices you have. We keep it to what the app actually does.</p>}
      sections={sections}
    />
  );
}
