// Public media: serves ONLY approved items.
import { ready, serveR2 } from "../../lib/server.js";

export async function onRequestGet({ request, env, params }) {
  if (!ready(env)) return new Response("Not available", { status: 503 });
  const row = await env.DB.prepare("SELECT r2_key, content_type FROM uploads WHERE id = ? AND status = 'approved'").bind(params.id).first();
  if (!row) return new Response("Not found", { status: 404 });
  return serveR2(request, env, row.r2_key, row.content_type, "public, max-age=3600");
}
