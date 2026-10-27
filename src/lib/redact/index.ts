const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/g,
  /ghs_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
  /sk-[A-Za-z0-9]{32,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----[\s\S]+?-----END (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g,
  /xox[baprs]-[A-Za-z0-9-]+/g,
];

export function redactSecrets(text: string) {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED_SECRET]");
  }
  result = result.replace(/([A-Z0-9_]+)=([^\s]+)/g, (m, key, val) => {
    if (key.includes("KEY") || key.includes("TOKEN") || key.includes("SECRET") || key.includes("PASSWORD")) {
      return `${key}=[REDACTED]`;
    }
    return m;
  });
  return result;
}

export function truncateLog(log: string, maxChars = 80000) {
  if (log.length <= maxChars) return log;
  return log.slice(0, maxChars) + "\n\n[...TRUNCATED...]\n";
}
