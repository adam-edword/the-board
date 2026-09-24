import { NextResponse } from "next/server";
import { version } from "@/lib/version";

// quick way to check what's deployed: curl https://theboard.eddtv.org/api/version
export function GET() {
  return NextResponse.json(version);
}
