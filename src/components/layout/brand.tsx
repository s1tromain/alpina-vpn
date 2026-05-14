import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Alpina VPN brand system.
 *
 * The brand mark is the alpine logo (mountains + sun + jet, see
 * /public/brand/alpina-logo.png). It's the only image we ship — every
 * scaled context (sidebar pill, topbar chip, splash, favicon) reuses the
 * same source.
 *
 * Sizing rules:
 *   sm  → 28px  (compact rows, topbar)
 *   md  → 36px  (sidebar header)
 *   lg  → 44px  (admin topbar)
 *   xl  → 96px  (splash / empty states)
 *
 * The mark renders inside a soft glass disc so it sits cleanly on both
 * pure-black and graphite-tinted surfaces. Pass `glow` to add a subtle
 * branded halo (used on splash + auth screens).
 */

const SIZE_PX = { sm: 28, md: 36, lg: 44, xl: 96 } as const;
const SIZE_CLS = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
  xl: "h-24 w-24",
} as const;

export type BrandSize = keyof typeof SIZE_PX;

export function BrandMark({
  size = "md",
  glow = false,
  className,
}: {
  size?: BrandSize;
  glow?: boolean;
  className?: string;
}) {
  const px = SIZE_PX[size];
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent",
        SIZE_CLS[size],
        glow && "shadow-glow-alpine",
        className,
      )}
    >
      {glow && (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-gradient-alpine opacity-40 blur-xl animate-brand-breath"
        />
      )}
      <Image
        src="/brand/alpina-logo.png"
        alt="Alpina VPN"
        width={px}
        height={px}
        priority={size === "xl"}
        className="rounded-xl object-contain"
      />
    </span>
  );
}

/**
 * Horizontal lockup — mark + wordmark side by side.
 * Used in the sidebar, topbar, and the splash screen footer line.
 */
export function BrandWordmark({
  size = "md",
  tagline = true,
  className,
}: {
  size?: Exclude<BrandSize, "xl">;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif font-medium tracking-[0.18em] text-gradient-silver",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          ALPINA<span className="ml-1 font-light tracking-[0.32em]">VPN</span>
        </span>
        {tagline && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Secure · Premium · Refined
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Stacked lockup — mark above the wordmark with a glow.
 * For the cold-start splash screen and any "no content yet" states.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <BrandMark size="xl" glow />
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-serif text-2xl font-medium tracking-[0.22em] text-gradient-silver">
          ALPINA<span className="ml-2 font-light tracking-[0.36em]">VPN</span>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Secure · Premium · Refined
        </span>
      </div>
    </div>
  );
}

/**
 * Branded loading spinner — a slim ring in the alpine accent. Use this
 * everywhere we would otherwise show the generic Lucide `<Loader2 />`
 * so spinners feel like part of the brand surface.
 */
export function BrandSpinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={cn("relative inline-block", className)}
    >
      <span
        className="absolute inset-0 rounded-full border-2 border-white/10"
        aria-hidden
      />
      <span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-alpine-300 border-r-alpine-300/50 animate-spin"
        aria-hidden
      />
    </span>
  );
}
