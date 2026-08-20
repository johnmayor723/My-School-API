const env = require("./env");

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cardNumber",
  "cvv",
  "secretKey",
]);

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACT_KEYS.has(key) ? "[redacted]" : redact(val, depth + 1);
  }
  return out;
}

function log(level, message, meta) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

module.exports = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
  debug: (message, meta) => {
    if (!env.isProduction) log("debug", message, meta);
  },
};
