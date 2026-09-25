import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />;
}

export function BoardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-32" />
        <Bone className="h-8 w-40" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Bone className="h-8 w-40" />
      <Bone className="h-10 w-full" />
      <Bone className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Bone className="h-8 w-24" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-8 w-16" />
        ))}
      </div>
      <Bone className="h-9 w-80" />
      <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
        <Bone className="h-80 rounded-xl" />
        <Bone className="h-[32rem] rounded-xl" />
      </div>
    </div>
  );
}
