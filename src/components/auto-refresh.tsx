"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// re-renders the page every so often so live scores tick without a manual reload
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    const onFocus = () => router.refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router, seconds]);
  return null;
}
