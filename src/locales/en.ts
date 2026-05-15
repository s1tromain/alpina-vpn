import type { Dict } from "./ru";

export const en: Dict = {
  language: {
    label: "Language",
    hint: "Applies across the interface",
    ru: "RU",
    en: "EN",
  },

  nav: {
    home: "Home",
    vpn: "VPN",
    orders: "Orders",
    profile: "Profile",
  },

  common: {
    back: "Back",
    continue: "Continue",
    cancel: "Cancel",
    create: "Create",
    submit: "Submit",
    save: "Save",
    edit: "Edit",
    remove: "Remove",
    open: "Open",
    view: "View",
    configure: "Configure",
    enable: "Enable",
    disable: "Disable",
    add: "Add",
    search: "Search",
    loading: "Loading…",
    submitting: "Submitting…",
    exportCsv: "Export CSV",
    devices: "devices",
    unlimited: "Unlimited",
    unlimitedTraffic: "Unlimited traffic",
    perMonth: "/ mo",
    save_n: "save {n}%",
    daysLeft: "{n} d",
    daysLeftLong: "{n} d left",
    online: "online",
    offline: "offline",
    total: "total",
    pingMs: "{n} ms",
    loadPct: "{n}% load",
    notifications: "Notifications",
    bell: "Notifications",
    retry: "Retry",
  },

  brand: {
    tagline: "Secure · Premium · Refined",
  },

  bootstrap: {
    openInTelegram: "Open Alpina VPN from Telegram to continue.",
    failedRetry: "Couldn't reach our servers. Check your connection and try again.",
  },

  errors: {
    updateFailed: "Couldn't save changes",
    deleteFailed: "Couldn't delete",
    createFailed: "Couldn't create",
    loadFailed: "Couldn't load",
  },

  status: {
    pending: "Pending",
    processing: "Processing",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
    active: "Active",
    inactive: "Disabled",
    online: "Online",
    offline: "Offline",
    maintenance: "Maintenance",
    on: "On",
    off: "Off",
  },

  roles: {
    admin: "Admin",
    operator: "Operator",
    user: "Member",
    member: "Member",
    premium: "Premium",
    standard: "Standard",
    tgPremium: "TG Premium",
  },

  home: {
    welcome: "Welcome back",
    welcomeName: "Welcome, {name}",
    locationsEyebrow: "Locations",
    locationsTitle: "Available countries",
    locationsAll: "All",
    membershipEyebrow: "Membership",
    membershipTitle: "Choose a tenure",
    membershipDesc: "Longer terms, gentler pricing.",
    whyEyebrow: "The house standard",
    whyTitle: "Why Alpina VPN",
    actionsEyebrow: "Access",
    actionsTitle: "Manage",
  },

  homeHeader: {
    protected: "Reality Protocol",
    inactive: "Inactive subscription",
    daysLeft: "{n} d left",
  },

  dashboard: {
    eyebrow: "Subscription",
    statusActive: "Active",
    statusInactive: "Inactive",
    server: "Server",
    ping: "Ping",
    expires: "Expires",
    daysLeft: "Days left",
    protocol: "Protocol",
    cipher: "Encryption",
    traffic: "Traffic",
    trafficUnlimited: "{used} · unlimited",
    devices: "Devices",
    inactiveTitle: "No active subscription",
    inactiveDesc:
      "Activate a subscription to unlock servers, config download and the QR-pairing flow.",
    activate: "Activate subscription",
  },

  actions: {
    config: {
      title: "Download config",
      subtitle: "VLESS · Reality",
    },
    qr: {
      title: "Show QR code",
      subtitle: "Quick pairing",
    },
    guide: {
      title: "Connection guide",
      subtitle: "iOS · Android · Windows · macOS",
    },
    devices: {
      title: "My devices",
      subtitle: "Manage connections",
    },
  },

  features: {
    items: [
      {
        title: "Zero logs",
        description: "Stateless servers. No identifiers. No history.",
      },
      {
        title: "Reality protocol",
        description: "Indistinguishable from regular TLS traffic.",
      },
      {
        title: "Premier locations",
        description: "Hand-picked endpoints in 10+ jurisdictions.",
      },
      {
        title: "Sub-30 ms ping",
        description: "Bare-metal nodes, 10 Gbps uplinks.",
      },
      {
        title: "Kill-switch",
        description: "Hiddify strict route, leak-proof by default.",
      },
      {
        title: "Private payments",
        description: "USDT, BTC, TON — fiat optional.",
      },
    ],
  },

  countries: {
    NL: "Netherlands",
    DE: "Germany",
    CH: "Switzerland",
    GB: "United Kingdom",
    US: "United States",
    JP: "Japan",
    SG: "Singapore",
    AE: "United Arab Emirates",
    FR: "France",
    SE: "Sweden",
    CA: "Canada",
    AU: "Australia",
    premier: "Premier",
  },

  cities: {
    Amsterdam: "Amsterdam",
    Frankfurt: "Frankfurt",
    "Zürich": "Zürich",
    Geneva: "Geneva",
    London: "London",
    "New York": "New York",
    "Los Angeles": "Los Angeles",
    Tokyo: "Tokyo",
    Singapore: "Singapore",
    Dubai: "Dubai",
    Paris: "Paris",
    Stockholm: "Stockholm",
    Toronto: "Toronto",
    Sydney: "Sydney",
  },

  orderNotes: {
    paymentNotReceived: "Payment not received in the expected window.",
    cancelledByCustomer: "Cancelled by customer.",
  },

  paymentReferences: {
    awaitingOnChain: "Awaiting on-chain confirmation",
  },

  relativeTime: {
    justNow: "just now",
    secondsAgo: "{n}s ago",
    minuteAgo: "a minute ago",
    minutesAgo: "{n} min ago",
    hourAgo: "an hour ago",
    hoursAgo: "{n}h ago",
    dayAgo: "yesterday",
    daysAgo: "{n}d ago",
    monthsAgo: "{n}mo ago",
  },

  plans: {
    "1m": "1 Month",
    "3m": "3 Months",
    "6m": "6 Months",
    "12m": "12 Months",
  },

  planBadges: {
    Popular: "Popular",
    "Best value": "Best value",
  },

  vpn: {
    title: "VPN",
    subtitle: "Subscription · servers · setup",
    subscriptionEyebrow: "Subscription",
    daysLeftBadge: "{n} d left",
    devicesLabel: "Devices",
    trafficLabel: "Traffic",
    trafficUnlimited: "{used} used · unlimited",
    trafficLimited: "{used} / {total}",
    tabAccess: "Access",
    tabServers: "Servers",
    qrCaption:
      "Open Hiddify → tap “Add profile” → scan this code. Configuration imports automatically.",
    subscriptionUrl: "Subscription URL",
    clientEyebrow: "Client",
    clientTitle: "Get Hiddify",
    clientDesc: "Our recommended client for every platform.",
    downloadHiddify: "Download Hiddify",
    openSite: "Open Hiddify website",
    platforms: {
      ios: "iOS / iPadOS",
      android: "Android",
      desktop: "macOS / Windows",
    },
    setupEyebrow: "Setup",
    setupTitle: "Connection guide",
    setupSteps: [
      "Install Hiddify on your device.",
      "Open the app and tap the “+” button or scan the QR.",
      "Pick the nearest country profile to connect.",
      "Enable strict-route for a kill-switch grade tunnel.",
    ],
    searchServers: "Search country or city",
    noActiveTitle: "No active subscription",
    noActiveDesc:
      "Once your order is approved, your subscription URL, devices and server list will appear here.",
    browsePlans: "Browse plans",
  },

  purchase: {
    title: "Purchase",
    stepN: "Step {n} / {total}",
    steps: {
      plan: "Plan",
      country: "Country",
      payment: "Payment",
      confirm: "Confirm",
    },
    iPaid: "I paid — submit order",
    iPaidShort: "I paid",
    submitting: "Submitting…",
    orderCreated: "Order created",
    orderCreatedDesc: "We'll notify you when payment is verified.",
    perMonth: "{amount} / mo",
    saveN: "save {n}%",
    devicesN: "{n} devices",
    totalLabel: "Total",
    sendExactly: "Send exactly",
    toAddress: "To address",
    addressCopied: "Address copied",
    warning:
      "Send the exact amount. After payment, tap “I paid” on the next step. Verification typically takes under 5 minutes.",
    summary: "Order summary",
    fields: {
      plan: "Plan",
      location: "Location",
      devices: "Devices",
      method: "Method",
      total: "Total",
    },
    fineprint:
      "By tapping “I paid” you confirm the transfer was sent. Your order will be reviewed by an operator — you'll receive a Telegram notification once approved.",
  },

  orders: {
    title: "Orders",
    subtitle: "Your purchase history",
    tabs: {
      all: "All",
      active: "Active",
      approved: "Approved",
      rejected: "Closed",
    },
    orderN: "Order #{id}",
    emptyTitle: "No orders here",
    emptyDesc:
      "When orders match this filter, they'll appear here with live status.",
  },

  profile: {
    title: "Profile",
    subtitle: "Account & subscription",
    telegramId: "Telegram ID",
    memberSince: "Member since",
    membershipEyebrow: "Membership",
    membershipTitle: "Active subscription",
    plan: "Plan",
    country: "Country",
    expires: "Expires",
    devices: "Devices",
    traffic: "Traffic",
    trafficUnlimited: "{used} · unlimited",
    trafficLimited: "{used} / {total}",
    daysRemaining: "Days remaining",
    manage: "Manage",
    noSub: "No active subscription. Activate one to begin.",
    browse: "Browse plans",
    supportTitle: "Support & FAQ",
    supportDesc: "Reach the concierge or browse common questions",
    settings: {
      eyebrow: "Settings",
      title: "Preferences",
    },
  },

  support: {
    title: "Support",
    subtitle: "Discreet, attentive help",
    contactTitle: "Concierge in Telegram",
    contactDesc:
      "Average reply under 4 minutes. Available 24 / 7 — in any language your client speaks.",
    contactCta: "Message support",
    diagnosticsEyebrow: "Diagnostics",
    diagnosticsTitle: "Common connection issues",
    knowledgeEyebrow: "Knowledge",
    knowledgeTitle: "Frequently asked",
    footerTagline: "A whisper, never a shout.",
    issues: [
      {
        title: "Connection drops",
        desc: "Switch to another country profile or enable Reality fallback in Hiddify settings.",
      },
      {
        title: "“Subscription not found”",
        desc: "Re-import the subscription URL — the previous certificate has been rotated.",
      },
      {
        title: "Slow speeds",
        desc: "Disable system-wide proxy first, then re-test. Distance matters: closer is faster.",
      },
    ],
    faq: [
      {
        q: "How long does activation take?",
        a: "After payment confirmation, your subscription is activated within 5 minutes. You'll receive a Telegram notification.",
      },
      {
        q: "Which devices are supported?",
        a: "Alpina VPN runs on iOS, Android, macOS, Windows and Linux through Hiddify, v2rayN, or any client supporting VLESS / Reality.",
      },
      {
        q: "Can I change country mid-subscription?",
        a: "Yes. Open the VPN page, switch country, and the subscription URL will reflect the new endpoint automatically.",
      },
      {
        q: "Do you keep logs?",
        a: "No. We operate a strict zero-log policy. Traffic is never inspected, recorded, or analysed.",
      },
      {
        q: "What if my connection drops?",
        a: "Hiddify offers a built-in kill switch. Enable Strict route for a guaranteed protection.",
      },
      {
        q: "How many devices may I connect?",
        a: "Plans range from 2 to 7 simultaneous devices. You can revoke a device from the VPN page at any time.",
      },
    ],
  },

  admin: {
    consoleEyebrow: "Console",
    overview: {
      title: "Overview",
      subtitle: "Health of the operation, at a glance.",
    },
    stats: {
      totalUsers: "Total users",
      activeSubs: "Active subs",
      revenue: "Revenue",
      servers: "Servers",
      approved: "Approved",
      rejected: "Rejected",
      pending: "Pending",
      approvalRate: "Approval rate",
      mom: "% MoM",
      allRegions: "All regions",
      pts: "+{n} pts",
    },
    recent: {
      eyebrow: "Recent orders",
      title: "Awaiting review",
      openQueue: "Open queue",
    },
    revenueCard: {
      eyebrow: "Weekly revenue",
      title: "Last 5 weeks",
      last30: "Last 30 days",
    },
    sidebar: {
      consoleLabel: "Console",
      dashboard: "Overview",
      users: "Users",
      orders: "Orders",
      servers: "Servers",
      requisites: "Requisites",
      settings: "Settings",
      exit: "Exit console",
    },
    topbar: {
      placeholder: "Search users, orders…",
    },
    users: {
      title: "Users",
      subtitle: "{n} registered",
      search: "Search by username, name or ID",
      tabs: { all: "All", users: "Members", operators: "Operators", admins: "Admins" },
      cols: {
        member: "Member",
        telegramId: "Telegram ID",
        role: "Role",
        tier: "Tier",
        registered: "Registered",
        lastSeen: "Last seen",
      },
    },
    orders: {
      title: "Orders",
      subtitle: "Approve, reject and triage payment claims.",
      search: "Search by user, ID, country",
      tabs: {
        all: "All",
        pending: "Pending",
        processing: "Processing",
        approved: "Approved",
        rejected: "Rejected",
      },
      cols: {
        order: "Order",
        plan: "Plan",
        amount: "Amount",
        created: "Created",
        status: "Status",
      },
      approve: "Approve",
      reject: "Reject",
      toastApproved: "Order {id} approved",
      toastRejected: "Order {id} rejected",
    },
    servers: {
      title: "Servers",
      subtitle: "{online} online · {total} total",
      add: "Add server",
      search: "Search country, city, protocol",
      cols: {
        server: "Server",
        protocol: "Protocol",
        status: "Status",
        load: "Load",
        ping: "Ping",
        bandwidth: "Bandwidth",
      },
    },
    requisites: {
      title: "Payment requisites",
      subtitle: "Where customers send payments.",
      countLine: "{active} active · {disabled} disabled",
      add: "Add requisite",
      dialog: {
        title: "New payment requisite",
        description:
          "Customers will be able to select this method during checkout.",
        label: "Label",
        labelPlaceholder: "USDT • TRC-20",
        address: "Address / card number",
        addressPlaceholder: "Address or PAN",
        currency: "Currency",
        network: "Network (optional)",
      },
      toastAdded: "Requisite added",
      toastRemoved: "Requisite removed",
      toastValidation: "Label and address are required",
    },
  },

  toasts: {
    copied: "Copied",
    copyFailed: "Copy failed",
    linkCopied: "Subscription link copied",
    addressCopied: "Address copied",
  },
};
