"use client";

import { Button } from "@/components/ui/button";

// last-resort catch so a failed request shows a retry instead of a blank crash
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <p className="font-heading text-lg font-semibold">something went sideways</p>
      <p className="text-sm text-muted-foreground">probably a network blip or a deploy mid-flight. try again.</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          reload
        </Button>
      </div>
    </div>
  );
}
