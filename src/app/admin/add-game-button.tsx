"use client";

import { useTransition } from "react";
import { CheckIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { addGame } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function AddGameButton({ added, args }: { added: boolean; args: Parameters<typeof addGame> }) {
  const [pending, start] = useTransition();
  if (added) {
    return (
      <Button size="sm" variant="ghost" disabled className="w-16 text-win">
        <CheckIcon /> added
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      className="w-16"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await addGame(...args);
          } catch {
            toast.error("couldn't add that game, try again");
          }
        })
      }
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} add
    </Button>
  );
}
