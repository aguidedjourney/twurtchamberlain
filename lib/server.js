// Shared helpers for Pages Functions.
export const LIMITS = { photo: 10 * 1024 * 1024, video: 90 * 1024 * 1024, perRequest: 5, perHour: 10 };
export const TYPES = { "image/jpeg": "photo", "video/mp4": "video", "video/quicktime": "video" };

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

export const ready = (env) => env.DB && env.UPLOADS && env.SIGNING_SECRET;
export const notReady = () => json({ error: "Uploads aren't set up yet. Please check back soon." }, 503);

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

const hmacKey = (secret, usage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
export const sign = async (secret, msg) => hex(await crypto.subtle.sign("HMAC", await hmacKey(secret, ["sign"]), enc.encode(msg)));
export async function verifySig(secret, msg, sig) {
  if (!/^[0-9a-f]{64}$/.test(sig || "")) return false;
  const bytes = new Uint8Array(sig.match(/../g).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", await hmacKey(secret, ["verify"]), bytes, enc.encode(msg));
}

// Check the real file signature, not just what the client claimed.
export function sniff(bytes, kind) {
  const is = (off, str) => [...str].every((c, i) => bytes[off + i] === c.charCodeAt(0));
  if (kind === "photo") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return is(4, "ftyp");
}

// Stream an R2 object with Range support so videos can seek.
export async function serveR2(request, env, key, contentType, cache) {
  const obj = await env.UPLOADS.get(key, { range: request.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  h.set("content-type", contentType);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("cache-control", cache);
  h.set("x-content-type-options", "nosniff");
  h.set("content-disposition", "inline");
  let status = 200;
  if (obj.range && request.headers.has("range")) {
    const r = obj.range;
    const start = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
    const end = r.suffix !== undefined ? obj.size - 1 : start + (r.length ?? obj.size - start) - 1;
    h.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    h.set("content-length", String(end - start + 1));
    status = 206;
  } else h.set("content-length", String(obj.size));
  return new Response(obj.body, { status, headers: h });
}
