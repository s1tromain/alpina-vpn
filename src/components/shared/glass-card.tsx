"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// framer-motion v11 widens `children` to include `MotionValue`, which collides
// with React's `ReactNode`. Narrow it back so consumers get a normal React
// child type and tsc stays happy.
interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  glow?: boolean;
  accent?: "default" | "premium";
  children?: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, glow, accent = "default", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden rounded-3xl border backdrop-blur-2xl",
          "border-white/[0.06] bg-white/[0.025]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
          accent === "premium" &&
            "border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent",
          glow && "shadow-[0_0_60px_-20px_rgba(192,192,192,0.4)]",
          className,
        )}
        {...props}
      >
        {/* subtle inner sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        {children}
      </motion.div>
    );
  },
);
GlassCard.displayName = "GlassCard";
