import Link from "next/link";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-prose space-y-5 text-sm leading-relaxed text-muted-foreground [&_h2]:pt-2 [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
      <div>
        <Link href="/" className="text-xs hover:text-foreground">
          ← the board
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-xs">last updated {updated}</p>
      </div>
      {children}
      <p className="border-t pt-4 text-xs">
        <Link href="/terms" className="hover:text-foreground">terms of service</Link> ·{" "}
        <Link href="/privacy" className="hover:text-foreground">privacy policy</Link>
      </p>
    </article>
  );
}
