import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "./google-button";

// public oauth client id (not a secret), overridable with GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = "403189984381-3ghkqm1haaal3u4pporpjjtdbac653sb.apps.googleusercontent.com";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getMe()) redirect("/");
  const { error } = await props.searchParams;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="gap-2">
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            tb
          </div>
          <CardTitle className="text-2xl font-semibold">the board</CardTitle>
          <CardDescription>weekly picks. no more whiteboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <GoogleButton
            supabaseUrl={process.env.SUPABASE_URL!}
            supabaseKey={process.env.SUPABASE_PUBLISHABLE_KEY!}
            clientId={process.env.GOOGLE_CLIENT_ID ?? GOOGLE_CLIENT_ID}
          />
          {error && <p className="text-sm text-destructive">sign in didn&apos;t work, try again</p>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground">terms</Link> ·{" "}
        <Link href="/privacy" className="hover:text-foreground">privacy</Link>
      </p>
    </div>
  );
}
