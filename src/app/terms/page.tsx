import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "terms of service · the board" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 24, 2026">
      <p>
        The Board (&ldquo;the app&rdquo;) at theboard.eddtv.org is a private, invite-only website a group of friends uses
        to make weekly picks on football games. By signing in you agree to these terms.
      </p>

      <h2>Who can use it</h2>
      <p>
        Access is by invitation only. You sign in with your Google account, and the site admin has to approve you
        before you can see or make picks. The admin can remove access at any time.
      </p>

      <h2>No gambling</h2>
      <p>
        The app is for fun only. It does not take, hold, or pay out money, and it isn&apos;t a betting or gambling
        service. Any side arrangements between players have nothing to do with the app.
      </p>

      <h2>Your picks</h2>
      <ul>
        <li>Picks lock when each game kicks off and can&apos;t be changed after that.</li>
        <li>Other members can see your picks once a game has started.</li>
        <li>Don&apos;t try to get around the pick locks, see other people&apos;s picks early, or mess with the site.</li>
      </ul>

      <h2>Game data</h2>
      <p>
        Schedules, scores, and results come from public ESPN data. The Board isn&apos;t affiliated with ESPN, the
        NFL, the NCAA, or any team. If a score or result is wrong or late, the admin can fix it, and the admin&apos;s
        call is final.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided &ldquo;as is&rdquo; with no guarantees that it&apos;ll be available, error free, or
        accurate. To the extent the law allows, the people running it aren&apos;t liable for any loss that comes
        from using it.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated from time to time. If you keep using the app after a change, that means you
        accept the new terms. How your information is handled is covered in the{" "}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </LegalPage>
  );
}
