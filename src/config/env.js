const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: optional("NODE_ENV", "development") === "production",
  port: Number(optional("PORT", 4200)),
  apiBasePath: optional("API_BASE_PATH", "/api/v1"),
  clientUrls: optional("CLIENT_URL", "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // The one canonical URL used INSIDE emails (reset/verify links) — distinct
  // from clientUrls, which is a CORS allowlist that can contain multiple dev
  // origins in any order. Using clientUrls[0] for email links was a real bug:
  // whichever dev origin happened to be added first (localhost:3000) ended up
  // in real users' inboxes.
  publicWebUrl: optional("PUBLIC_WEB_URL", "https://myschoolplacement.com"),

  mongodbUri: required("MONGODB_URI"),

  jwtSecret: required("JWT_SECRET"),
  jwtAccessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtRefreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d"),
  bcryptSaltRounds: Number(optional("BCRYPT_SALT_ROUNDS", 12)),

  paymentProvider: optional("PAYMENT_PROVIDER", "mock"),
  assessmentPriceNgn: Number(optional("ASSESSMENT_PRICE_NGN", 2100)),
  assessmentCurrency: optional("ASSESSMENT_CURRENCY", "NGN"),
  paymentWebhookSecret: optional("PAYMENT_WEBHOOK_SECRET", ""),

  paystack: {
    secretKey: optional("PAYSTACK_SECRET_KEY", ""),
    publicKey: optional("PAYSTACK_PUBLIC_KEY", ""),
  },
  flutterwave: {
    secretKey: optional("FLUTTERWAVE_SECRET_KEY", ""),
    publicKey: optional("FLUTTERWAVE_PUBLIC_KEY", ""),
    secretHash: optional("FLUTTERWAVE_SECRET_HASH", ""),
  },

  // Outbound mail goes through the shared gemfi-mail-service (same box,
  // internal-only /send endpoint) rather than SMTP directly — this app's own
  // ZeptoMail credential (SMTP_* below) is broken (535 Authentication
  // Failed), but gemfi-mail-service's is a separate, working ZeptoMail
  // account already proven by GemFi's onboarding-welcome emails. SMTP_* is
  // kept as a local fallback only (used when GEMFI_MAIL_SERVICE_URL is
  // unset), not removed, in case this ever needs to run off-box.
  mail: {
    host: optional("SMTP_HOST", ""),
    port: Number(optional("SMTP_PORT", 587)),
    secure: optional("SMTP_SECURE", "false") === "true",
    user: optional("SMTP_USER", ""),
    pass: optional("SMTP_PASS", ""),
    from: optional("MAIL_FROM", "no-reply@myschoolplacement.ng"),
    fromName: optional("MAIL_FROM_NAME", "My School Placement"),
  },

  gemfiMail: {
    url: optional("GEMFI_MAIL_SERVICE_URL", ""),
    internalSecret: optional("GEMFI_MAIL_INTERNAL_SECRET", ""),
  },

  // Passwordless sign-up/login for Student accounts (see src/modules/accounts).
  // STAFF still logs in with a password.
  otp: {
    codeLength: Number(optional("OTP_CODE_LENGTH", 6)),
    ttlMinutes: Number(optional("OTP_TTL_MINUTES", 10)),
    cooldownSeconds: Number(optional("OTP_COOLDOWN_SECONDS", 60)),
    maxPerHourPerIdentifier: Number(optional("OTP_MAX_PER_HOUR", 5)),
  },

  // Phone is a fully supported OTP identifier (signup, login, deletion);
  // sendSms() logs instead of sending until these are set — no separate
  // enabled flag, dropping in real values is enough to go live.
  sms: {
    termiiApiKey: optional("TERMII_API_KEY", ""),
    termiiSenderId: optional("TERMII_SENDER_ID", ""),
  },

  rateLimit: {
    windowMinutes: Number(optional("RATE_LIMIT_WINDOW_MINUTES", 15)),
    max: Number(optional("RATE_LIMIT_MAX", 300)),
    authWindowMinutes: Number(optional("AUTH_RATE_LIMIT_WINDOW_MINUTES", 15)),
    authMax: Number(optional("AUTH_RATE_LIMIT_MAX", 20)),
    otpWindowMinutes: Number(optional("OTP_RATE_LIMIT_WINDOW_MINUTES", 15)),
    otpMax: Number(optional("OTP_RATE_LIMIT_MAX", 10)),
  },

  // Phase 2: no AI SDK is wired in yet — this flag exists so the pipeline's
  // AI-extraction slot-in point (BaseScraper.runAiFallback) can be enabled
  // later purely by config, without a structural change. See
  // src/services/cutoffAiExtraction.service.js.
  aiExtractionEnabled: optional("AI_EXTRACTION_ENABLED", "false") === "true",

  // Student-facing AI chat (Item 7). Off by default: dark-launched until an
  // API key exists, same convention as sms.enabled above. See
  // src/modules/ai-chat/chatService.js.
  aiChat: {
    enabled: optional("AI_CHAT_ENABLED", "false") === "true",
    apiKey: optional("NVIDIA_KEY", ""),
    model: optional("AI_CHAT_MODEL", "z-ai/glm-5.3-flash"),
  },

  seed: {
    adminEmail: optional("SEED_ADMIN_EMAIL", "admin@myschoolplacement.ng"),
    adminPassword: optional("SEED_ADMIN_PASSWORD", ""),
    studentPassword: optional("SEED_STUDENT_PASSWORD", ""),
  },
};

module.exports = env;
