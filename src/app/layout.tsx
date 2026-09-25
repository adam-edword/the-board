import type { Metadata, Viewport } from "next";
import {
  Covered_By_Your_Grace,
  Fuzzy_Bubbles,
  Gaegu,
  Geist,
  Geist_Mono,
  Lacquer,
  Pangolin,
  Protest_Revolution,
} from "next/font/google";
import Link from "next/link";
import { getMe } from "@/lib/data";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import { versionLabel } from "@/lib/version";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// marker fonts people can pick for their name on the board (see lib/markers.ts).
// next/font needs each one as its own module-level const.
const pangolin = Pangolin({ variable: "--font-pangolin", subsets: ["latin"], weight: "400" });
const protestRevolution = Protest_Revolution({ variable: "--font-protest-revolution", subsets: ["latin"], weight: "400" });
const lacquer = Lacquer({ variable: "--font-lacquer", subsets: ["latin"], weight: "400" });
const fuzzyBubbles = Fuzzy_Bubbles({ variable: "--font-fuzzy-bubbles", subsets: ["latin"], weight: "400" });
const gaegu = Gaegu({ variable: "--font-gaegu", subsets: ["latin"], weight: "400" });
const coveredByYourGrace = Covered_By_Your_Grace({ variable: "--font-covered-by-your-grace", subsets: ["latin"], weight: "400" });
const markerFonts = [pangolin, protestRevolution, lacquer, fuzzyBubbles, gaegu, coveredByYourGrace]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "the board",
  description: "weekly football picks",
  appleWebApp: { capable: true, title: "the board", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();

  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${markerFonts} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          {me && (
            <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
              <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
                <Link href="/" className="mr-auto flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
                  <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                    tb
                  </span>
                  the board
                </Link>
                <SiteNav me={me} />
              </div>
            </header>
          )}
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center text-[11px] text-muted-foreground/60">
            {versionLabel()}
          </footer>
          <Toaster theme="dark" position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
