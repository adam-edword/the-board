import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Gochi_Hand, Kalam, Permanent_Marker, Rock_Salt, Sedgwick_Ave } from "next/font/google";
import Link from "next/link";
import { getMe } from "@/lib/data";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import { versionLabel } from "@/lib/version";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// marker-style font for names on the board, a nod to the old whiteboard
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: ["400", "700"] });
// the other marker fonts people can pick on their profile (see lib/markers.ts)
const permanentMarker = Permanent_Marker({ variable: "--font-permanent-marker", subsets: ["latin"], weight: "400" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["400", "700"] });
const rockSalt = Rock_Salt({ variable: "--font-rock-salt", subsets: ["latin"], weight: "400" });
const gochiHand = Gochi_Hand({ variable: "--font-gochi-hand", subsets: ["latin"], weight: "400" });
const sedgwickAve = Sedgwick_Ave({ variable: "--font-sedgwick-ave", subsets: ["latin"], weight: "400" });
const markerFonts = [permanentMarker, caveat, rockSalt, gochiHand, sedgwickAve].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "the board",
  description: "weekly football picks",
  appleWebApp: { title: "the board", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();

  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${kalam.variable} ${markerFonts} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          {me && (
            <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
              <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
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
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center text-[11px] text-muted-foreground/60">
            {versionLabel()}
          </footer>
          <Toaster theme="dark" position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
