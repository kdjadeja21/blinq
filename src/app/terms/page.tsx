import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and Conditions — Blinq",
  description: "The rules for using Blinq, the memory game: accounts, multiplayer conduct, leaderboards and more.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms and Conditions (&quot;Terms&quot;) govern your use of {SITE.name}, a memory game available at{" "}
          <a href={SITE.url}>{SITE.url}</a> and as an installable web app (the &quot;Service&quot;). The Service is
          operated by {SITE.operator}, {SITE.operatorCountry} (&quot;we&quot;, &quot;us&quot;).
        </p>
        <p>
          By using the Service you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you
          do not agree, please do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use Blinq",
    body: (
      <>
        <p>
          Creating an account, appearing on leaderboards and using multiplayer rooms are for people aged{" "}
          {SITE.minAge} or older. If you are under {SITE.adultAge}, you may use these features only with the
          permission and supervision of a parent or legal guardian, who agrees to these Terms on your behalf.
        </p>
        <p>
          If you believe a child under {SITE.minAge} has created an account or joined a room, please email us and we
          will remove the data.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Guest play and accounts",
    body: (
      <>
        <ul>
          <li>
            <strong>Guests</strong> can play solo levels up to level {SITE.guestMaxLevel}. Guest progress is stored only
            in your browser and can be lost if you clear site data or switch devices.
          </li>
          <li>
            <strong>Signed-in players</strong> sign in through our authentication provider (Clerk, for example with a
            Google account). Signing in unlocks higher levels and the daily challenge, and saves your progress to your
            account. When you first sign in, your local guest progress is merged into your account.
          </li>
          <li>
            <strong>Multiplayer</strong> does not require an account. You join a room with a nickname through an
            anonymous session.
          </li>
        </ul>
        <p>
          You are responsible for activity on your account and for keeping your sign-in credentials secure. Tell us
          promptly if you suspect unauthorized use.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Acceptable use and multiplayer conduct",
    body: (
      <>
        <p>When you use the Service, you agree not to:</p>
        <ul>
          <li>
            choose a nickname or display name (up to {SITE.maxNameLength} characters in multiplayer) that is offensive,
            hateful, sexually explicit or impersonates another person. Some names are blocked automatically, and we may
            remove or change names that break this rule;
          </li>
          <li>harass, threaten or abuse other players;</li>
          <li>
            cheat or gain an unfair advantage, including by using bots, scripts, automation or exploiting bugs, or
            manipulate scores, rankings or the daily challenge;
          </li>
          <li>attempt to access data or accounts that are not yours, or interfere with, overload or reverse engineer the Service;</li>
          <li>use the Service for any unlawful purpose or in violation of these Terms.</li>
        </ul>
        <p>
          Multiplayer rooms hold up to {SITE.maxPlayersTeam} players in team mode and {SITE.maxPlayersIndividual} in
          individual mode. The player who creates a room acts as its admin and controls how the room proceeds. Rooms are
          temporary and are deleted automatically (see the <Link href="/privacy#retention">Privacy Policy</Link>).
        </p>
      </>
    ),
  },
  {
    id: "leaderboards",
    title: "Leaderboards and public information",
    body: (
      <p>
        Scores of signed-in players appear on the public leaderboard (daily, weekly and all-time views), which anyone can view
        without signing in. The leaderboard shows your display name, avatar and score totals. Scores in multiplayer rooms
        are visible to the other players in that room. Do not use a display name or avatar you do not want shown
        publicly.
      </p>
    ),
  },
  {
    id: "content",
    title: "Your content and our rights",
    body: (
      <>
        <p>
          You keep ownership of anything you provide, such as your nickname and display name. You give us a limited,
          non-exclusive, royalty-free licence to store and display it as needed to run the Service (for example, in
          lobbies and on leaderboards).
        </p>
        <p>
          The Service, including its name, design, game logic, graphics and software, belongs to {SITE.operator} or its
          licensors and is protected by law. We grant you a personal, non-exclusive, non-transferable, revocable right to
          use the Service for your own non-commercial entertainment. You may not copy, sell or exploit it except as
          permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "paid",
    title: "Paid features",
    body: (
      <>
        <p>
          The Service is currently free and does not accept payments. We may introduce paid features in the future.
          If we do, we will publish the pricing, billing, refund and cancellation terms for those features before they
          are available, and update these Terms and the Privacy Policy accordingly. Paid features will never apply to you
          without your clear action to purchase them.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the Service",
    body: (
      <p>
        We work to keep Blinq available, but it is provided on an &quot;as available&quot; basis. Multiplayer and sign-in
        depend on an internet connection and on third-party providers, and there may be interruptions, maintenance or
        data loss. We may add, change or remove features, levels, modes or leaderboards at any time.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimers",
    body: (
      <>
        <p>
          Blinq is a game made for entertainment. It is not a medical device or a diagnostic tool, and it does not
          provide medical, psychological or health advice. Memory test results and accuracy figures in the app are
          informal and should not be used to assess any health condition. We make no promise that playing will improve
          memory or cognitive ability.
        </p>
        <p>
          To the fullest extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as available&quot;,
          without warranties of any kind, whether express or implied.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, we are not liable for any indirect, incidental, special or consequential
        loss, or for loss of data, progress, scores or rankings, arising from your use of the Service. Because the
        Service is free, we are not liable for any amount in connection with it beyond what the law requires. Nothing in these Terms
        limits liability that cannot be limited under applicable law.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p>
        You can stop using Blinq at any time, and you can ask us to delete your account by emailing{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. We may suspend or remove accounts, nicknames,
        scores or rooms, or restrict access, if we reasonably believe these Terms have been broken or to protect the
        Service and other players.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These Terms are governed by {SITE.governingLaw}, without regard to conflict-of-law rules. Courts in India have
        jurisdiction over disputes relating to the Service, unless mandatory consumer protection law in your place of
        residence says otherwise. Before starting a formal dispute, please contact us so we can try to resolve it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms from time to time. The &quot;Last updated&quot; date above shows the latest version. If
        a change is significant, we will give notice in the app or on this page. Continuing to use the Service after a
        change means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these Terms? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      updated={SITE.legalUpdated}
      intro={<p>Please read these terms carefully. They explain the rules for playing {SITE.name} and what you can expect from us.</p>}
      sections={sections}
    />
  );
}
