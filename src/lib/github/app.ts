import jwt from "jsonwebtoken";

export function createAppJwt(appId: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + (10 * 60),
    iss: appId,
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

export async function getInstallationToken(appId: string, privateKey: string, installationId: string) {
  const appJwt = createAppJwt(appId, privateKey);
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to get installation token: ${res.status}`);
  }
  return res.json();
}
