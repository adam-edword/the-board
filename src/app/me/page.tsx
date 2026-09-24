import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { updateName } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function MePage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">your name on the board</CardTitle>
        <CardDescription>signed in as {me.email}</CardDescription>
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
  );
}
