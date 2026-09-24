import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { signOut, updateName } from "@/app/actions";

export default async function MePage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">you</h1>
      <form action={updateName} className="space-y-2">
        <label htmlFor="name" className="block text-sm text-zinc-400">
          name on the board
        </label>
        <div className="flex gap-2">
          <input
            id="name"
            name="name"
            defaultValue={me.name}
            maxLength={40}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
          <button className="rounded-lg bg-white px-4 py-2 font-medium text-zinc-900">save</button>
        </div>
      </form>
      <p className="text-sm text-zinc-500">signed in as {me.email}</p>
      <form action={signOut}>
        <button className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">sign out</button>
      </form>
    </div>
  );
}
