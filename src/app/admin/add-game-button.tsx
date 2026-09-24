"use client";

import { useTransition } from "react";
import { addGame } from "@/app/actions";

export function AddGameButton({ added, args }: { added: boolean; args: Parameters<typeof addGame> }) {
  const [pending, start] = useTransition();
  if (added) return <span className="w-14 text-center text-xs text-lime-400">added</span>;
  return (
    <button
      onClick={() => start(() => addGame(...args))}
      disabled={pending}
      className="w-14 rounded-lg bg-white py-1 text-xs font-medium text-zinc-900 disabled:opacity-50"
    >
      {pending ? "…" : "add"}
    </button>
  );
}
