// Public: approved items only.
import { json, ready, notReady } from "../../lib/server.js";

export async function onRequestGet({ env }) {
  if (!ready(env)) return notReady();
  const { results } = await env.DB.prepare(
    "SELECT id, kind, caption, name, show_name FROM uploads WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT 120"
  ).all();
  return json({ items: results }, 200, { "cache-control": "public, max-age=60" });
}
