import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.04]",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-shimmer before:bg-[length:200%_100%] before:animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}
