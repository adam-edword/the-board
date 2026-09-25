"use client";

import { Button } from "@/components/ui/button";

export function ConfirmButton({ message, children, variant = "destructive" }: {
  message: string;
  children: React.ReactNode;
  variant?: "destructive" | "outline";
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size="sm"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
