import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Idempotent seed for local dev. Populates the catalogue (plans, countries,
 * a few VPN servers) and one inactive crypto requisite as an example.
 *
 * Run: `npm run db:seed`
 */
const GB = 1024n * 1024n * 1024n;

async function main() {
  const plans: Prisma.PlanCreateInput[] = [
    {
      slug: "starter",
      tier: "starter",
      label: "Starter",
      priceUsd: "3.00",
      durationDays: 30,
      trafficLimit: 50n * GB,
      maxDevices: 2,
      features: ["50 GB / month", "2 devices", "All locations"],
      sortOrder: 1,
    },
    {
      slug: "standard",
      tier: "standard",
      label: "Standard",
      priceUsd: "5.00",
      durationDays: 30,
      trafficLimit: 150n * GB,
      maxDevices: 3,
      badge: "popular",
      features: ["150 GB / month", "3 devices", "Priority routing"],
      sortOrder: 2,
    },
    {
      slug: "premium",
      tier: "premium",
      label: "Premium",
      priceUsd: "10.00",
      durationDays: 30,
      trafficLimit: 500n * GB,
      maxDevices: 5,
      badge: "best-value",
      features: ["500 GB / month", "5 devices", "Priority support"],
      sortOrder: 3,
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

  // One active card requisite. Operators edit/replace it via /admin/requisites.
  const existing = await prisma.paymentRequisite.findFirst({
    where: { title: "Visa · Alpina Bank" },
  });
  if (!existing) {
    await prisma.paymentRequisite.create({
      data: {
        title: "Visa · Alpina Bank",
        cardNumber: "4169 7388 1234 5678",
        ownerName: "ALPINA VPN LLC",
        bankName: "Alpina Bank",
        instructions:
          "Transfer the exact amount, then upload a screenshot of the receipt. Approval is usually within 10 minutes.",
        active: true,
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
