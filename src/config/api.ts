// API Base URL Configuration
// - Development: Uses NEXT_PUBLIC_BACKEND_URL or localhost
// - Production: Regular API calls use relative URLs (proxied through Vercel rewrite)
//               SSE endpoints connect directly to backend (Vercel proxy doesn't support streaming)
const isDevelopment = process.env.NODE_ENV === 'development';


// Trim any trailing slash from the backend URL to prevent double-slash paths
// (e.g. "https://api.example.com/" + "/api/send" → "https://api.example.com//api/send"
//  which triggers a Go 301 redirect that converts POST → GET → 405)
const rawBackendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');

export const API_BASE_URL = isDevelopment
  ? (rawBackendUrl || 'http://localhost:4000')
  : ''; // Production uses relative URLs -> Vercel proxy -> backend

// Direct backend URL for SSE endpoints (QR code stream, send progress)
// Vercel's rewrite proxy buffers responses and does NOT support Server-Sent Events.
// These endpoints MUST connect directly to the backend server.
export const SSE_BASE_URL = rawBackendUrl || API_BASE_URL;

// Full backend URL for the website chatbot embed script.
// The widget is loaded on external websites so it CANNOT use relative URLs.
// Falls back to the current origin in dev, but MUST be set via NEXT_PUBLIC_BACKEND_URL in production.
export const WIDGET_BASE_URL = rawBackendUrl || (isDevelopment ? 'http://localhost:4000' : (typeof window !== 'undefined' ? window.location.origin : ''));


export const API_ENDPOINTS = {
  whatsapp: {
    init: `${API_BASE_URL}/api/whatsapp/init`,
    pairPhone: `${API_BASE_URL}/api/whatsapp/pair-phone`,
    qr: `${SSE_BASE_URL}/api/whatsapp/qr`,           // SSE — direct to backend
    status: `${API_BASE_URL}/api/whatsapp/status`,
    disconnect: `${API_BASE_URL}/api/whatsapp/disconnect`,
    send: `${SSE_BASE_URL}/api/whatsapp/send`,         // SSE — direct to backend
    contacts: `${API_BASE_URL}/api/whatsapp/contacts`,
    sendBg: `${API_BASE_URL}/api/whatsapp/send-bg`,
    bgJobStatus: (id: string) => `${API_BASE_URL}/api/whatsapp/send-bg/${id}`,
    bgJobStop: (id: string) => `${API_BASE_URL}/api/whatsapp/send-bg/${id}`,
  },
  whatsappBusiness: {
    status: `${API_BASE_URL}/api/whatsapp-business/status`,
    exchangeCode: `${API_BASE_URL}/api/whatsapp-business/exchange-code`,
    manualConnect: `${API_BASE_URL}/api/whatsapp-business/manual-connect`,
    disconnect: `${API_BASE_URL}/api/whatsapp-business/disconnect`,
    templates: `${API_BASE_URL}/api/whatsapp-business/templates`,
    deleteTemplate: (name: string) => `${API_BASE_URL}/api/whatsapp-business/templates/${name}`,
    send: `${API_BASE_URL}/api/whatsapp-business/send`,
    broadcast: `${API_BASE_URL}/api/whatsapp-business/broadcast`,
    messages: `${API_BASE_URL}/api/whatsapp-business/messages`,
    botConfig: `${API_BASE_URL}/api/whatsapp-business/config/bot`,
    webhook: `${API_BASE_URL}/api/whatsapp-business/webhook`,
  },
  upload: {
    contacts: `${API_BASE_URL}/api/upload`,
    image: `${API_BASE_URL}/api/upload/image`,
  },
  auth: {
    register: `${API_BASE_URL}/api/auth/register`,
    sendOtp: `${API_BASE_URL}/api/auth/send-otp`,
    verifyOtp: `${API_BASE_URL}/api/auth/verify-otp`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
    login: `${API_BASE_URL}/api/auth/login`,
    me: `${API_BASE_URL}/api/auth/me`,
    sessions: `${API_BASE_URL}/api/auth/sessions`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    logoutAll: `${API_BASE_URL}/api/auth/logout-all`,
    googleLogin: `${API_BASE_URL}/api/auth/google`,
  },
  templates: {
    list: `${API_BASE_URL}/api/templates`,
    create: `${API_BASE_URL}/api/templates`,
    update: (id: number) => `${API_BASE_URL}/api/templates/${id}`,
    delete: (id: number) => `${API_BASE_URL}/api/templates/${id}`,
  },
  credits: {
    me: `${API_BASE_URL}/api/credits`,
    costs: `${API_BASE_URL}/api/credits/costs`,
    adminCosts: `${API_BASE_URL}/api/admin/credits/costs`,
    adminUser: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/credits`,
  },
  subscription: {
    status: `${API_BASE_URL}/api/subscription`,
    initiate: `${API_BASE_URL}/api/payment/initiate`,
    razorpayVerify: `${API_BASE_URL}/api/payment/razorpay/verify`,
    history: `${API_BASE_URL}/api/payment/history`,
    plans: `${API_BASE_URL}/api/subscription/plans`,
    validatePromo: `${API_BASE_URL}/api/payment/validate-promo`,
    currency: `${API_BASE_URL}/api/payment/currency`,
  },
  admin: {
    stats: `${API_BASE_URL}/api/admin/stats`,
    users: `${API_BASE_URL}/api/admin/users`,
    user: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    userRankCredits: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/rank-credits`,
    seoAgent: `${API_BASE_URL}/api/admin/seo-agent`,
    logs: `${API_BASE_URL}/api/admin/logs`,
    sendEmail: `${API_BASE_URL}/api/admin/email/promotional`,
    userActivity: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/activity`,
    updateUserPlan: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/plan`,
    updateUserServices: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/services`,
    invoices: `${API_BASE_URL}/api/admin/invoices`,
    invoice: (id: string) => `${API_BASE_URL}/api/admin/invoices/${id}`,
    approveInvoice: (id: string) => `${API_BASE_URL}/api/admin/invoices/${id}/approve`,
    plans: `${API_BASE_URL}/api/admin/plans`,
    plan: (name: string) => `${API_BASE_URL}/api/admin/plans/${name}`,
    promos: `${API_BASE_URL}/api/admin/promos`,
    promo: (id: string) => `${API_BASE_URL}/api/admin/promos/${id}`,
    serviceAvailability: `${API_BASE_URL}/api/admin/services/availability`,
    transactions: `${API_BASE_URL}/api/admin/transactions`,
    aiConfig: `${API_BASE_URL}/api/admin/ai/config`,
    leadsAll: `${API_BASE_URL}/api/admin/leads/all`,
    leadsSettings: `${API_BASE_URL}/api/admin/leads/settings`,
    leadsTrigger: `${API_BASE_URL}/api/admin/leads/trigger`,
  },
  services: {
    availability: `${API_BASE_URL}/api/services/availability`,
  },
  contacts: {
    list: `${API_BASE_URL}/api/contacts`,
    save: `${API_BASE_URL}/api/contacts`,
    delete: (id: string) => `${API_BASE_URL}/api/contacts/${id}`,
    deleteAll: `${API_BASE_URL}/api/contacts`,
  },
  schedule: {
    list: `${API_BASE_URL}/api/schedule`,
    create: `${API_BASE_URL}/api/schedule`,
    cancel: (id: string) => `${API_BASE_URL}/api/schedule/${id}`,
  },
  apiKeys: {
    list: `${API_BASE_URL}/api/apikeys`,
    create: `${API_BASE_URL}/api/apikeys`,
    revoke: (id: string) => `${API_BASE_URL}/api/apikeys/${id}`,
  },
  bot: {
    get: `${API_BASE_URL}/api/bot`,
    upsert: `${API_BASE_URL}/api/bot`,
    detectionLogs: `${API_BASE_URL}/api/bot/detection-logs`,
    detectionStats: `${API_BASE_URL}/api/bot/detection-stats`,
  },
  campaigns: {
    list: `${API_BASE_URL}/api/campaigns`,
    get: (id: string) => `${API_BASE_URL}/api/campaigns/${id}`,
    messages: (id: string) => `${API_BASE_URL}/api/campaigns/${id}/messages`,
    segments: (id: string) => `${API_BASE_URL}/api/campaigns/${id}/segments`,
    retarget: (id: string) => `${API_BASE_URL}/api/campaigns/${id}/retarget`,
    followUp: (id: string) => `${API_BASE_URL}/api/campaigns/${id}/follow-up`,
    followUpGenerate: (id: string) => `${API_BASE_URL}/api/campaigns/${id}/follow-up/generate`,
    markReplyRead: (campaignId: string, msgId: string) =>
      `${API_BASE_URL}/api/campaigns/${campaignId}/messages/${msgId}/read-reply`,
    reply: (campaignId: string, msgId: string) =>
      `${API_BASE_URL}/api/campaigns/${campaignId}/messages/${msgId}/reply`,
  },
  security: {
    settings: `${API_BASE_URL}/api/settings/security`,
    heartbeat: `${API_BASE_URL}/api/activity/heartbeat`,
    userUsageStats: `${API_BASE_URL}/api/user/usage-stats`,
  },
  // ── Email (Omnichannel) ───────────────────────────────────────────────
  email: {
    smtp: `${API_BASE_URL}/api/email/smtp`,
    smtpTest: `${API_BASE_URL}/api/email/smtp/test`,
    send: `${SSE_BASE_URL}/api/email/send`,      // SSE — direct to backend
    inbox: `${API_BASE_URL}/api/email/inbox`,
    inboxMetadata: `${API_BASE_URL}/api/email/inbox/metadata`,
    updateInboxMetadata: (uid: string) => `${API_BASE_URL}/api/email/inbox/metadata/${uid}`,
    schedule: `${API_BASE_URL}/api/email/schedule`,
    cancelSchedule: (id: string) => `${API_BASE_URL}/api/email/schedule/${id}`,
    templates: `${API_BASE_URL}/api/email/templates`,
    deleteTemplate: (id: string) => `${API_BASE_URL}/api/email/templates/${id}`,
    bot: `${API_BASE_URL}/api/email/bot`,
    copyBot: `${API_BASE_URL}/api/email/bot/copy-from-whatsapp`,
    sent: `${API_BASE_URL}/api/email/sent`,
    sentHostinger: `${API_BASE_URL}/api/email/sent/hostinger`,
    sentHostingerMessage: (uid: number) => `${API_BASE_URL}/api/email/sent/hostinger/message/${uid}`,
    uploadDeck: `${API_BASE_URL}/api/email/deck`,
    uploadImage: `${API_BASE_URL}/api/email/images`,
    campaigns: `${API_BASE_URL}/api/email/campaigns`,
    campaign: (id: string) => `${API_BASE_URL}/api/email/campaigns/${id}`,
    campaignRecipients: (id: string) => `${API_BASE_URL}/api/email/campaigns/${id}/recipients`,
    campaignRetarget: (id: string) => `${API_BASE_URL}/api/email/campaigns/${id}/retarget`,
    analyticsOverview: `${API_BASE_URL}/api/email/analytics/overview`,
    domains: `${API_BASE_URL}/api/email/domains`,
    domain: (id: string) => `${API_BASE_URL}/api/email/domains/${id}`,
    verifyDomain: (id: string) => `${API_BASE_URL}/api/email/domains/${id}/verify`,
    domainRecords: (id: string) => `${API_BASE_URL}/api/email/domains/${id}/records`,
    mailboxes: `${API_BASE_URL}/api/email/mailboxes`,
    mailbox: (id: string) => `${API_BASE_URL}/api/email/mailboxes/${id}`,
    mailboxPassword: (id: string) => `${API_BASE_URL}/api/email/mailboxes/${id}/password`,
    mailboxConnectSMTP: (id: string) => `${API_BASE_URL}/api/email/mailboxes/${id}/connect-smtp`,
    mailboxSendOnly: (id: string) => `${API_BASE_URL}/api/email/mailboxes/${id}/send-only`,
    mailboxQuota: `${API_BASE_URL}/api/email/mailboxes/quota`,
    inboxMailboxes: `${API_BASE_URL}/api/email/inbox/mailboxes`,
  },
  // ── Facebook (Omnichannel) ────────────────────────────────────────────
  facebook: {
    oauthUrl:       `${API_BASE_URL}/api/facebook/oauth-url`,
    exchangeToken:  `${API_BASE_URL}/api/facebook/exchange-token`,
    status:         `${API_BASE_URL}/api/facebook/status`,
    disconnect:     `${API_BASE_URL}/api/facebook/disconnect`,
    pages:          `${API_BASE_URL}/api/facebook/pages`,
    selectPage:     `${API_BASE_URL}/api/facebook/pages/select`,
    posts:          `${API_BASE_URL}/api/facebook/posts`,
    post:           (id: string) => `${API_BASE_URL}/api/facebook/posts/${id}`,
    postInsights:   (id: string) => `${API_BASE_URL}/api/facebook/posts/${id}/insights`,
    schedule:       `${API_BASE_URL}/api/facebook/schedule`,
    cancelSchedule: (id: string) => `${API_BASE_URL}/api/facebook/schedule/${id}`,
    ogPreview:      `${API_BASE_URL}/api/facebook/og-preview`,
  },
  // ── LinkedIn (OAuth2 API) ─────────────────────────────────────────────
  linkedin: {
    credentials:    `${API_BASE_URL}/api/linkedin/credentials`,
    authUrl:        `${API_BASE_URL}/api/linkedin/auth-url`,
    disconnect:     `${API_BASE_URL}/api/linkedin/disconnect`,
    status:         `${API_BASE_URL}/api/linkedin/status`,
    posts:          `${API_BASE_URL}/api/linkedin/posts`,
    post:           (id: string) => `${API_BASE_URL}/api/linkedin/posts/${id}`,
    schedule:       `${API_BASE_URL}/api/linkedin/schedule`,
    cancelSchedule: (id: string) => `${API_BASE_URL}/api/linkedin/schedule/${id}`,
    bot:            `${API_BASE_URL}/api/linkedin/bot`,
    botRun:         `${API_BASE_URL}/api/linkedin/bot/run`,
    botSuggest:     `${API_BASE_URL}/api/linkedin/bot/suggest`,
    approveAction:  `${API_BASE_URL}/api/linkedin/approve-action`,
  },
  // ── SEO Extension ─────────────────────────────────────────────────────────
  seo: {
    config:     `${API_BASE_URL}/api/seo/config`,
    dashboard:  `${API_BASE_URL}/api/seo/dashboard`,
    pages:      `${API_BASE_URL}/api/seo/pages`,
    pageDetail: (url: string) => `${API_BASE_URL}/api/seo/pages/detail?url=${encodeURIComponent(url)}`,
    vitals:     `${API_BASE_URL}/api/seo/vitals`,
    issues:     `${API_BASE_URL}/api/seo/issues`,
    verify:     `${API_BASE_URL}/api/seo/verify`,
    autofix:    `${API_BASE_URL}/api/seo/autofix`,
    bot:        `${API_BASE_URL}/api/seo/bot`,
    botRun:     `${API_BASE_URL}/api/seo/bot/run`,
    trends:     (geo: string) => `${API_BASE_URL}/api/seo/trends?geo=${encodeURIComponent(geo)}`,
    gtm:        `${API_BASE_URL}/api/seo/gtm`,
    gtmVerify:  `${API_BASE_URL}/api/seo/gtm/verify`,
    resetData:  `${API_BASE_URL}/api/seo/data`,
    scan:       `${API_BASE_URL}/api/seo/scan`,
    scanStream: `${SSE_BASE_URL}/api/seo/scan/stream`,
    keywordResearch:        `${API_BASE_URL}/api/seo/keywords/research`,
    keywordTargets:         `${API_BASE_URL}/api/seo/keywords/targets`,
    keywordTargetDelete:    (id: string) => `${API_BASE_URL}/api/seo/keywords/targets/${id}`,
    keywordAgent:           (id: string) => `${API_BASE_URL}/api/seo/keywords/agent/${id}`,
    keywordScan:            (id: string) => `${API_BASE_URL}/api/seo/keywords/scan/${id}`,
    keywordDaily:           (id: string) => `${API_BASE_URL}/api/seo/keywords/daily/${id}`,
    keywordAutopilot:       (id: string) => `${API_BASE_URL}/api/seo/keywords/autopilot/${id}`,
    keywordInsights:        `${API_BASE_URL}/api/seo/keywords/insights`,
    keywordInsightsSend:    `${API_BASE_URL}/api/seo/keywords/insights/send`,
    rankConfig:             `${API_BASE_URL}/api/seo/rank/config`,
    rankSync:               `${API_BASE_URL}/api/seo/rank/sync`,
    rankStrategy:           `${API_BASE_URL}/api/seo/rank/strategy`,
    rankRun:                `${API_BASE_URL}/api/seo/rank/run`,
    rankRuns:               `${API_BASE_URL}/api/seo/rank/runs`,
    rankRunDetail:          (id: string) => `${API_BASE_URL}/api/seo/rank/runs/${id}`,
    rankRunPR:              (id: string) => `${API_BASE_URL}/api/seo/rank/runs/${id}/pr`,
    rankRunMerge:           (id: string) => `${API_BASE_URL}/api/seo/rank/runs/${id}/merge`,
    rankCredits:            `${API_BASE_URL}/api/seo/rank/credits`,
    rankGithubDisconnect:   `${API_BASE_URL}/api/seo/rank/github/disconnect`,
  },
  // ── SEO Blog (GitHub App) ─────────────────────────────────────────────────────
  seoBlog: {
    installUrl:  `${API_BASE_URL}/api/seo/blog/install-url`,
    callback:    `${API_BASE_URL}/api/seo/blog/callback`,
    repos:       `${API_BASE_URL}/api/seo/blog/repos`,
    config:      `${API_BASE_URL}/api/seo/blog/config`,
    test:        `${API_BASE_URL}/api/seo/blog/test`,
    run:         `${API_BASE_URL}/api/seo/blog/run`,
    posts:       `${API_BASE_URL}/api/seo/blog/posts`,
    detect:      `${API_BASE_URL}/api/seo/blog/detect`,
    preview:     (id: string) => `${API_BASE_URL}/api/seo/blog/posts/${id}/preview`,
  },
  // ── Website Chatbot ───────────────────────────────────────────────────
  websiteChatbot: {
    config: `${API_BASE_URL}/api/website-chatbot/config`,
    crawl: `${API_BASE_URL}/api/website-chatbot/crawl`,
    script: `${API_BASE_URL}/api/website-chatbot/script`,
    chat: `${API_BASE_URL}/api/website-chatbot/chat`,
    leads: `${API_BASE_URL}/api/website-chatbot/leads`,
    submitLead: `${API_BASE_URL}/api/website-chatbot/leads/submit`,
    testCustomAi: `${API_BASE_URL}/api/website-chatbot/test-custom-ai`,
  },
  // ── Leads Manager ──────────────────────────────────────────────────────────
	leads: {
		list:          `${API_BASE_URL}/api/leads`,
		delete:        `${API_BASE_URL}/api/leads`,
		export:        `${API_BASE_URL}/api/leads/export`,
		import:        `${API_BASE_URL}/api/leads/import`,
		quota:         `${API_BASE_URL}/api/leads/quota`,
		claimTrial:    `${API_BASE_URL}/api/leads/claim-trial`,
		addon:         `${API_BASE_URL}/api/leads/addon`,
		config:        `${API_BASE_URL}/api/leads/config`,
		stats:         `${API_BASE_URL}/api/leads/quota`,
		share:         `${API_BASE_URL}/api/leads/share`,
		autopilot:     `${API_BASE_URL}/api/leads/autopilot`,
		saveAutopilot: `${API_BASE_URL}/api/leads/autopilot/save`,
		sendDraft:     `${API_BASE_URL}/api/leads/send-draft`,
	},
  health: `${API_BASE_URL}/api/health`,
  // ── Chatbot Demo (public marketing tool) ─────────────────────────────────
  chatbotDemo: {
    check: `${API_BASE_URL}/api/chatbot-demo/check`, // requires JWT
    get: (id: string) => `${API_BASE_URL}/api/public/chatbot-demo/${id}`,
    update: (id: string) => `${API_BASE_URL}/api/public/chatbot-demo/${id}`,
    chat: (id: string) => `${API_BASE_URL}/api/public/chatbot-demo/${id}/chat`,
    lead: (id: string) => `${API_BASE_URL}/api/public/chatbot-demo/${id}/lead`,
  },
  adminChatbotDemo: {
    list: `${API_BASE_URL}/api/admin/chatbot-demos`,
    create: `${API_BASE_URL}/api/admin/chatbot-demos`,
    delete: (id: string) => `${API_BASE_URL}/api/admin/chatbot-demos/${id}`,
  },
  dataDeletion: {
    submit: `${API_BASE_URL}/api/data-deletion`,
  },
  adminDeletion: {
    list: `${API_BASE_URL}/api/admin/deletion-requests`,
    approve: (id: string) => `${API_BASE_URL}/api/admin/deletion-requests/${id}/approve`,
    reject: (id: string) => `${API_BASE_URL}/api/admin/deletion-requests/${id}/reject`,
  },
  // ── Influencer / Affiliate portal ─────────────────────────────────────────
  influencer: {
    me:        `${API_BASE_URL}/api/influencer/me`,
    dashboard: `${API_BASE_URL}/api/influencer/dashboard`,
  },
  adminInfluencer: {
    list:   `${API_BASE_URL}/api/admin/influencers`,
    create: `${API_BASE_URL}/api/admin/influencers`,
    update: (id: string) => `${API_BASE_URL}/api/admin/influencers/${id}`,
    payout: (id: string) => `${API_BASE_URL}/api/admin/influencers/${id}/payout`,
  },
  oauth: {
    approve: `${API_BASE_URL}/api/oauth/approve`,
    clientInfo: (clientId: string) => `${API_BASE_URL}/api/oauth/client-info?client_id=${encodeURIComponent(clientId)}`,
  },
  // ── Nexbot Calendar & Booking ─────────────────────────────────────────────
  calendar: {
    oauthUrl: `${API_BASE_URL}/api/calendar/oauth-url`,
    exchangeCode: `${API_BASE_URL}/api/calendar/exchange-code`,
    status: `${API_BASE_URL}/api/calendar/status`,
    disconnect: `${API_BASE_URL}/api/calendar/disconnect`,
    eventTypes: `${API_BASE_URL}/api/calendar/event-types`,
    eventType: (id: string) => `${API_BASE_URL}/api/calendar/event-types/${id}`,
    availability: `${API_BASE_URL}/api/calendar/availability`,
    branding: `${API_BASE_URL}/api/calendar/branding`,
    bookings: `${API_BASE_URL}/api/calendar/bookings`,
    cancelBooking: (id: string) => `${API_BASE_URL}/api/calendar/bookings/${id}/cancel`,
    webhooks: `${API_BASE_URL}/api/calendar/webhooks`,
    webhook: (id: string) => `${API_BASE_URL}/api/calendar/webhooks/${id}`,
    // Public
    publicEvent: (user: string, slug: string) => `${API_BASE_URL}/api/calendar/public/${user}/${slug}`,
    publicSlots: (user: string, slug: string, date: string, tz?: string) =>
      `${API_BASE_URL}/api/calendar/public/${user}/${slug}/slots?date=${date}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`,
    publicBook: (user: string, slug: string) => `${API_BASE_URL}/api/calendar/public/${user}/${slug}/book`,
    publicBookingDetails: (id: string) => `${API_BASE_URL}/api/calendar/public/booking/${id}`,
    publicCancelBooking: (id: string) => `${API_BASE_URL}/api/calendar/public/booking/${id}/cancel`,
    publicRescheduleBooking: (id: string) => `${API_BASE_URL}/api/calendar/public/booking/${id}/reschedule`,
    embedScript: `${API_BASE_URL}/api/calendar/embed.js`,
  },
  lifeCompanion: {
    session: `${API_BASE_URL}/api/life-companion/session`,
    history: `${API_BASE_URL}/api/life-companion/history`,
    chat: `${API_BASE_URL}/api/life-companion/chat`,
    verifyScreenshot: `${API_BASE_URL}/api/life-companion/verify-screenshot`,
    reset: `${API_BASE_URL}/api/life-companion/reset`,
  },
  trading: {
    authUrl: `${API_BASE_URL}/api/trading/broker/auth-url`,
    callback: `${API_BASE_URL}/api/trading/broker/callback`,
    saveEncrypted: `${API_BASE_URL}/api/trading/broker/save-encrypted`,
    status: `${API_BASE_URL}/api/trading/broker/status`,
    strategies: `${API_BASE_URL}/api/trading/strategies`,
    strategy: (id: string) => `${API_BASE_URL}/api/trading/strategies/${id}`,
    strategyGenerateAI: `${API_BASE_URL}/api/trading/strategy/generate-ai`,
    strategyValidate: `${API_BASE_URL}/api/trading/strategy/validate`,
    strategyAiGenerateDSL: `${API_BASE_URL}/api/trading/strategy/ai-generate-dsl`,
    strategyAiModifyDSL: `${API_BASE_URL}/api/trading/strategy/ai-modify-dsl`,
    strategyPineScriptToDSL: `${API_BASE_URL}/api/trading/strategy/pinescript-to-dsl`,
    strategyVersions: (id: string) => `${API_BASE_URL}/api/trading/strategy/${id}/versions`,
    aiTrainStrategy: `${API_BASE_URL}/api/trading/ai/train-strategy`,
    marketSearch: `${API_BASE_URL}/api/trading/market/search`,
    backtest: `${API_BASE_URL}/api/trading/backtest`,
    backtestAiAnalyze: `${API_BASE_URL}/api/trading/backtest/ai-analyze`,
    botStart: `${API_BASE_URL}/api/trading/bot/start`,
    botStop: `${API_BASE_URL}/api/trading/bot/stop`,
    signals: `${API_BASE_URL}/api/trading/bot/signals`,
    signalAction: `${API_BASE_URL}/api/trading/bot/signal-action`,
  },
  freelancer: {
    credentials: `${API_BASE_URL}/api/freelancer/credentials`,
    status:      `${API_BASE_URL}/api/freelancer/status`,
    disconnect:  `${API_BASE_URL}/api/freelancer/disconnect`,
    botConfig:   `${API_BASE_URL}/api/freelancer/bot/config`,
    botRun:      `${API_BASE_URL}/api/freelancer/bot/run`,
    botPending:  `${API_BASE_URL}/api/freelancer/bot/pending`,
    botHistory:  `${API_BASE_URL}/api/freelancer/bot/history`,
  },
  agents: {
    list: `${API_BASE_URL}/api/agents`,
    create: `${API_BASE_URL}/api/agents`,
    templates: `${API_BASE_URL}/api/agents/templates`,
    hireTemplate: `${API_BASE_URL}/api/agents/templates/hire`,
    get: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
    update: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
    test: (id: string) => `${API_BASE_URL}/api/agents/${id}/test`,
    executions: (id: string) => `${API_BASE_URL}/api/agents/${id}/executions`,
    deploy: (id: string) => `${API_BASE_URL}/api/agents/${id}/deploy`,
    pause: (id: string) => `${API_BASE_URL}/api/agents/${id}/pause`,
    validate: `${API_BASE_URL}/api/agents/validate`,
    // Public URL that external systems POST to; relative in production (proxied).
    hook: (token: string) => `${API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/api/agents/hooks/${token}`,
  },
  connectors: {
    list: `${API_BASE_URL}/api/connectors`,
    create: `${API_BASE_URL}/api/connectors`,
    parseCurl: `${API_BASE_URL}/api/connectors/parse-curl`,
    get: (id: string) => `${API_BASE_URL}/api/connectors/${id}`,
    update: (id: string) => `${API_BASE_URL}/api/connectors/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/connectors/${id}`,
    test: (id: string) => `${API_BASE_URL}/api/connectors/${id}/test`,
  },
};

/**
 * Fetch wrapper that automatically attaches the Authorization header
 * from localStorage. Does not force Content-Type on FormData requests.
 * Automatically prepends API_BASE_URL when a relative path string is provided.
 */
export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set JSON content-type when body is not FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let finalUrl = url;
  if (API_BASE_URL && url.startsWith('/') && !url.startsWith('http')) {
    finalUrl = `${API_BASE_URL}${url}`;
  }

  return fetch(finalUrl, { ...options, headers }).then((res) => {
    // 402 = out of credits: let the app-wide banner offer a top-up.
    if (res.status === 402 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexbotix:out-of-credits'));
    }
    return res;
  });
};

/**
 * Safe JSON response parser that prevents raw JavaScript syntax errors
 * when an API returns HTML (e.g. 502 Bad Gateway, 404 Not Found, or SPA fallback).
 */
export async function safeJsonResponse<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.startsWith('<!DOCTYPE') || text.includes('<html') || text.includes('<body')) {
      throw new Error(
        `Backend service returned HTML (${res.status} ${res.statusText || 'Error'}). The API route may be unavailable or proxying incorrectly.`
      );
    }
    if (!res.ok) {
      throw new Error(text || `Request failed with status ${res.status}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid response format from server (${res.status})`);
    }
  }

  const json = await res.json();
  return json;
}
