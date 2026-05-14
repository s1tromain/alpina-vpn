import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-white/[0.06] text-foreground",
        success:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        warning:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        destructive:
          "border-red-400/20 bg-red-400/10 text-red-300",
        pending:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        approved:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        rejected:
          "border-red-400/20 bg-red-400/10 text-red-300",
        outline:
          "border-white/15 bg-transparent text-muted-foreground",
        premium:
          "border-silver/30 bg-gradient-to-r from-white/10 via-silver/20 to-white/10 text-silver-light",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
