import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "privacy policy · the board" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 24, 2026">
      <p>
        This policy explains what The Board (theboard.eddtv.org) collects when you use it and what happens to it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From Google sign-in:</strong> your name, email address, and profile photo. Nothing else is
          requested from your Google account.
        </li>
        <li>
          <strong>What you do in the app:</strong> your picks, the time you made them, and the display name you set.
        </li>
        <li>
          <strong>Cookies:</strong> one login session cookie that keeps you signed in. No ads, analytics, or tracking
          cookies.
        </li>
      </ul>

      <h2>How it&apos;s used</h2>
      <p>
        Only to run the app: signing you in, showing your name next to your picks, and keeping score. Your
        information is never sold, rented, or used for advertising.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>Other approved members see your display name, profile photo, and picks.</li>
        <li>The site admin can also see your email address so they can approve you.</li>
        <li>
          Data is stored with Supabase, our database and login provider, which processes it on our behalf. The app
          itself is hosted on a private server run by the site admin.
        </li>
      </ul>

      <h2>Google user data</h2>
      <p>
        The Board&apos;s use and transfer of information received from Google APIs follows the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. Google data is used only to sign you in and show who you are
        within the app.
      </p>

      <h2>Keeping and deleting data</h2>
      <p>
        Your data is kept while you&apos;re a member. Ask the site admin and your account and picks will be
        deleted. You can also remove the app&apos;s access anytime from your Google account&apos;s
        security settings.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top will be updated.</p>
    </LegalPage>
  );
}
