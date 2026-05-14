import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ClientOnly } from "@/components/shared/client-only";
import { LanguageInit } from "@/components/shared/language-init";
import { HtmlLangSync } from "@/components/shared/html-lang-sync";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600"],
  display: "swap",
});

// All public-facing metadata flows through this object. Keep brand strings
// here only — page-level titles are added per-route via `metadata` exports.
const SITE_NAME = "Alpina VPN";
const SITE_TAGLINE = "Alpina VPN — Secure Premium VPN";
const SITE_DESCRIPTION =
  "Alpina VPN — secure, premium private networking, served entirely inside Telegram. Reality + VLESS, no logs, concierge support.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpinavpn.example",
  ),
  title: {
    default: SITE_TAGLINE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: "/brand/alpina-logo.png",
        width: 1024,
        height: 1024,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    images: ["/brand/alpina-logo.png"],
  },
  // Surface the bot username for Telegram link unfurls — harmless if unset.
  other: {
    "telegram:channel": process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Match the app background exactly so the iOS / Android browser chrome
  // and the Telegram WebView header blend with our canvas — no white flash
  // during cold start or while the JS chunk is loading.
  themeColor: "#050506",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${playfair.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/*
          Inline pre-paint background fill. Renders before Tailwind boots
          so the first paint is the brand graphite rather than the default
          white — critical on iOS Safari and the Telegram WebView, which
          briefly show the document background before CSS attaches.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background:#050506;color:#e8e8e8}`,
          }}
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <LanguageInit />
        <HtmlLangSync />
        {children}
        <ClientOnly>
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-graphite-900/95 !border-white/10 !text-foreground !backdrop-blur-xl !rounded-2xl",
                description: "!text-muted-foreground",
              },
            }}
          />
        </ClientOnly>
      </body>
    </html>
  );
}
