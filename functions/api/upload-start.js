// Step 1: verify Turnstile + consent, register pending rows, hand back signed per-file upload slots.
import { LIMITS, TYPES, json, ready, notReady, sha256, sign } from "../../lib/server.js";

const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function onRequestPost({ request, env }) {
  if (!ready(env)) return notReady();
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ error: "Bad request" }, 415);
  const body = await request.json().catch(() => null);
  if (!body || body.consent !== true) return json({ error: "Please confirm the permission checkbox." }, 400);

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length || files.length > LIMITS.perRequest) return json({ error: `Choose 1–${LIMITS.perRequest} files.` }, 400);
  for (const f of files) {
    const kind = TYPES[f?.type];
    if (!kind) return json({ error: "Only photos (JPEG) and videos (MP4/MOV) are accepted." }, 400);
    if (!Number.isInteger(f.size) || f.size <= 0 || f.size > LIMITS[kind]) return json({ error: `A ${kind} is too large (max ${LIMITS[kind] / 1048576} MB).` }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.set("secret", env.TURNSTILE_SECRET);
    form.set("response", String(body.token || ""));
    form.set("remoteip", ip);
    const v = await fetch(env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form }).then((r) => r.json()).catch(() => null);
    if (!v?.success) return json({ error: "Human check failed. Please refresh and try again." }, 400);
  } else return json({ error: "Uploads aren't set up yet. Please check back soon." }, 503);

  const ipHash = await sha256(ip + env.SIGNING_SECRET);
  const now = Date.now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM uploads WHERE ip_hash = ? AND created_at > ?").bind(ipHash, now - 3600_000).first();
  if (recent.n + files.length > LIMITS.perHour) return json({ error: "That's a lot of uploads. Please try again in an hour." }, 429);

  const name = clip(body.name, 60), show = clip(body.show, 80);
  const slots = [];
  const stmts = [];
  for (const f of files) {
    const id = crypto.randomUUID();
    stmts.push(
      env.DB.prepare("INSERT INTO uploads (id, kind, content_type, size, r2_key, name, show_name, status, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,'uploading',?,?)")
        .bind(id, TYPES[f.type], f.type, f.size, `uploads/${id}`, name, show, ipHash, now)
    );
    slots.push({ id, sig: await sign(env.SIGNING_SECRET, id) });
  }
  await env.DB.batch(stmts);
  return json({ slots });
}
