import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Idempotent seed for local dev. Populates the catalogue (plans, countries,
 * a few VPN servers) and one inactive crypto requisite as an example.
 *
 * Run: `npm run db:seed`
 */
async function main() {
  const plans: Prisma.PlanCreateInput[] = [
    {
      slug: "1m",
      duration: "m1",
      label: "1 Month",
      priceUsd: "5.99",
      monthlyEquivalent: "5.99",
      maxDevices: 3,
      features: ["3 devices", "All countries", "Reality + VLESS"],
      sortOrder: 1,
    },
    {
      slug: "3m",
      duration: "m3",
      label: "3 Months",
      priceUsd: "15.99",
      monthlyEquivalent: "5.33",
      savingsPercent: 11,
      maxDevices: 3,
      features: ["3 devices", "All countries", "Priority support"],
      sortOrder: 2,
    },
    {
      slug: "6m",
      duration: "m6",
      label: "6 Months",
      priceUsd: "29.99",
      monthlyEquivalent: "5.00",
      savingsPercent: 17,
      badge: "popular",
      maxDevices: 5,
      features: ["5 devices", "All countries", "Priority support"],
      sortOrder: 3,
    },
    {
      slug: "12m",
      duration: "m12",
      label: "12 Months",
      priceUsd: "49.99",
      monthlyEquivalent: "4.17",
      savingsPercent: 30,
      badge: "best-value",
      maxDevices: 5,
      features: ["5 devices", "All countries", "Priority support"],
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  const countries = [
    { code: "NL", name: "Netherlands", flag: "🇳🇱", ping: 18, load: 42 },
    { code: "DE", name: "Germany", flag: "🇩🇪", ping: 22, load: 51 },
    { code: "US", name: "United States", flag: "🇺🇸", ping: 95, load: 60 },
    { code: "JP", name: "Japan", flag: "🇯🇵", ping: 140, load: 33, premium: true },
    { code: "SG", name: "Singapore", flag: "🇸🇬", ping: 160, load: 28, premium: true },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }

  // Sample server per country (used by admin server view / future Marzban link)
  for (const c of countries) {
    const existing = await prisma.vpnServer.findFirst({
      where: { countryCode: c.code, city: "primary" },
    });
    if (!existing) {
      await prisma.vpnServer.create({
        data: {
          countryCode: c.code,
          city: "primary",
          status: "online",
          load: c.load,
          ping: c.ping,
          bandwidth: 1000,
          protocol: "Reality",
          premium: c.premium ?? false,
        },
      });
    }
  }

  // One disabled crypto requisite as an example. Operators add real ones via /admin/requisites.
  const existing = await prisma.paymentRequisite.findFirst({
    where: { label: "USDT TRC20 — sample" },
  });
  if (!existing) {
    await prisma.paymentRequisite.create({
      data: {
        method: "crypto",
        label: "USDT TRC20 — sample",
        address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        currency: "USDT",
        network: "TRC20",
        active: false,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("[seed] Done.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[seed] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
