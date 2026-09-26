import { redirect } from "next/navigation";
import { getMe, getOtherMarkers, getTakenColors } from "@/lib/data";
import { firstName } from "@/lib/format";
import { updateName } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkerPicker } from "./marker-picker";

export default async function MePage() {
  const me = await getMe();
  if (!me) redirect("/login");
  const [taken, others] = await Promise.all([getTakenColors(), getOtherMarkers(me.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">your marker</CardTitle>
          <CardDescription>how your name looks on the board.</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkerPicker
            name={firstName(me.name).toLowerCase()}
            color={me.marker_color}
            font={me.marker_font}
            id={me.id}
          taken={taken}
          others={others}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">your name</CardTitle>
          <CardDescription>shows up in standings and on your player page.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateName} className="space-y-2">
            <Label htmlFor="name">display name</Label>
            <div className="flex gap-2">
              <Input id="name" name="name" defaultValue={me.name} maxLength={40} />
              <Button type="submit">save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
