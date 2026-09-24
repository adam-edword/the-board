import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { GoogleButton } from "./google-button";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getMe()) redirect("/");
  const { error } = await props.searchParams;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">the board</h1>
        <p className="mt-2 text-zinc-400">weekly picks. no more whiteboard.</p>
      </div>
      <GoogleButton supabaseUrl={process.env.SUPABASE_URL!} supabaseKey={process.env.SUPABASE_PUBLISHABLE_KEY!} />
      {error && <p className="text-sm text-red-400">sign in didn&apos;t work, try again</p>}
    </div>
  );
}
