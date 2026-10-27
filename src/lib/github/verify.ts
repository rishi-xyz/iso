import crypto from "crypto";

export function verifyGitHubSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}
