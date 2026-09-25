"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { completeOnboarding } from "@/app/actions";
import { MarkerFields, freeColor, type TakenColors } from "@/app/me/marker-picker";
import type { Marker, MarkerColor, MarkerFont } from "@/lib/markers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WelcomeForm(props: {
  id: string;
  name: string;
  color: MarkerColor;
  font: MarkerFont;
  taken: TakenColors;
  others: Marker[];
}) {
  const [name, setName] = useState(props.name);
  // start on a color nobody has (the default white may already be taken)
  const [color, setColor] = useState(() => freeColor(props.color, props.taken));
  const [font, setFont] = useState(props.font);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await completeOnboarding(name, color, font);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">what should the board call you?</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" />
      </div>
      <MarkerFields
        id={props.id}
        name={name.trim() || "you"}
        color={color}
        font={font}
        taken={props.taken}
        others={props.others}
        onColor={setColor}
        onFont={setFont}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending || !name.trim()}>
        {pending ? "saving…" : "let's go"}
      </Button>
    </form>
  );
}
