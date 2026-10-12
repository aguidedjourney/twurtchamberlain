// Every /api/admin/* call must carry a valid Cloudflare Access JWT. Fails closed if Access isn't configured.
import { json } from "../../../lib/server.js";

const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function verifyAccess(request, env) {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64u(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64u(p)));
    if (header.alg !== "RS256") return false;
    const certs = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600, cacheEverything: true } }).then((r) => r.json());
    const jwk = certs.keys.find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
    const aud = [].concat(payload.aud || []);
    return ok && aud.includes(env.ACCESS_AUD) && payload.iss === `https://${env.ACCESS_TEAM_DOMAIN}` && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function onRequest(ctx) {
  if (!(await verifyAccess(ctx.request, ctx.env))) return json({ error: "Unauthorized" }, 401);
  if (ctx.request.method === "POST" && !(ctx.request.headers.get("content-type") || "").includes("application/json")) return json({ error: "Bad request" }, 415);
  return ctx.next();
}
