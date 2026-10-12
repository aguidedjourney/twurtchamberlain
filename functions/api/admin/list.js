import { json } from "../../../lib/server.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status") === "approved" ? "approved" : "pending";
  const { results } = await env.DB.prepare(
    "SELECT id, kind, size, name, show_name, caption, created_at FROM uploads WHERE status = ? ORDER BY created_at DESC LIMIT 200"
  ).bind(status).all();
  return json({ items: results });
}
