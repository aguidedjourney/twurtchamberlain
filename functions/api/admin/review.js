// approve | reject (deletes the file) | unpublish (back to pending)
import { json } from "../../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const { id, action, caption } = (await request.json().catch(() => ({}))) || {};
  const row = await env.DB.prepare("SELECT r2_key FROM uploads WHERE id = ? AND status IN ('pending','approved')").bind(String(id)).first();
  if (!row) return json({ error: "Not found" }, 404);
  const now = Date.now();
  if (action === "approve") {
    await env.DB.prepare("UPDATE uploads SET status='approved', caption=?, reviewed_at=? WHERE id=?").bind(String(caption || "").trim().slice(0, 200), now, id).run();
  } else if (action === "unpublish") {
    await env.DB.prepare("UPDATE uploads SET status='pending', reviewed_at=? WHERE id=?").bind(now, id).run();
  } else if (action === "reject") {
    await env.UPLOADS.delete(row.r2_key);
    await env.DB.prepare("UPDATE uploads SET status='rejected', reviewed_at=? WHERE id=?").bind(now, id).run();
  } else return json({ error: "Unknown action" }, 400);
  return json({ ok: true });
}
