"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function SiteNav({ me }: { me: Profile }) {
  const path = usePathname();
  const links = [
    ...(me.approved ? [{ href: "/standings", label: "standings" }] : []),
    ...(me.is_admin ? [{ href: "/admin", label: "admin" }] : []),
  ];

  return (
    <>
      {links.map((l) => (
        <Button key={l.href} asChild variant={path.startsWith(l.href) ? "secondary" : "ghost"} size="sm">
          <Link href={l.href}>{l.label}</Link>
        </Button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar>
            {me.avatar_url && <AvatarImage src={me.avatar_url} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback>{me.name.slice(0, 1).toLowerCase()}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/me">
              <UserIcon /> change name
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOutIcon /> sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
