const SENSITIVE_KEY = /(password|token|secret|api.?key|authorization|email|photo.?url|image.?url|storage.?path)/i;

function safeValue(value) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string" && value.length > 200) return `${value.slice(0, 197)}...`;
  return value;
}

function sanitize(fields) {
  return Object.entries(fields).reduce((result, [key, value]) => {
    if (!SENSITIVE_KEY.test(key)) result[key] = safeValue(value);
    return result;
  }, {});
}

export function createCorrelationId(prefix = "req") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createScanId() {
  return createCorrelationId("scan");
}

function write(level, moduleName, message, fields = {}) {
  const details = sanitize(fields);
  const suffix = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
  console[level](`[${new Date().toISOString()}] [${level.toUpperCase()}] [${moduleName}] ${message}${suffix}`);
}

export const logger = {
  debug: (moduleName, message, fields) => write("debug", moduleName, message, fields),
  info: (moduleName, message, fields) => write("info", moduleName, message, fields),
  warn: (moduleName, message, fields) => write("warn", moduleName, message, fields),
  error: (moduleName, message, fields) => write("error", moduleName, message, fields),
};
