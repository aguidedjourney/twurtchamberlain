// Admin preview of any pending/approved file.
import { serveR2 } from "../../../../lib/server.js";

export async function onRequestGet({ request, env, params }) {
  const row = await env.DB.prepare("SELECT r2_key, content_type FROM uploads WHERE id = ? AND status IN ('pending','approved')").bind(params.id).first();
  if (!row) return new Response("Not found", { status: 404 });
  return serveR2(request, env, row.r2_key, row.content_type, "private, no-store");
}
