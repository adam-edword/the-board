import { redirect } from "next/navigation";
import { getMe, getOtherMarkers, getTakenColors } from "@/lib/data";
import { firstName } from "@/lib/format";
import { WelcomeForm } from "./welcome-form";

export default async function WelcomePage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.onboarded) redirect("/");
  const [taken, others] = await Promise.all([getTakenColors(), getOtherMarkers(me.id)]);

  return (
    <div className="mx-auto max-w-md space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">grab a marker</h1>
        <p className="text-sm text-muted-foreground">
          pick how your name shows up on the board. you can change it later from your profile.
        </p>
      </div>
      <WelcomeForm
        name={firstName(me.name).toLowerCase()}
        color={me.marker_color}
        font={me.marker_font}
        id={me.id}
        taken={taken}
        others={others}
      />
    </div>
  );
}
