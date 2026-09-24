import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getMe } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "the board",
  description: "weekly football picks",
  appleWebApp: { title: "the board", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {me && (
          <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur pt-[env(safe-area-inset-top)]">
            <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 h-14 text-sm">
              <Link href="/" className="font-bold tracking-tight text-base mr-auto">
                the board
              </Link>
              {me.approved && (
                <Link href="/standings" className="text-zinc-400 hover:text-white">
                  standings
                </Link>
              )}
              {me.is_admin && (
                <Link href="/admin" className="text-zinc-400 hover:text-white">
                  admin
                </Link>
              )}
              <Link href="/me" aria-label="your profile">
                {me.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar_url} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-zinc-800 text-xs">
                    {me.name.slice(0, 1).toLowerCase()}
                  </span>
                )}
              </Link>
            </nav>
          </header>
        )}
        <main className="mx-auto max-w-3xl px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">{children}</main>
      </body>
    </html>
  );
}
