// Step 2: stream one file straight into the private R2 bucket.
import { json, ready, notReady, verifySig, sniff } from "../../../lib/server.js";

export async function onRequestPut({ request, env, params }) {
  if (!ready(env)) return notReady();
  const id = params.id;
  const sig = new URL(request.url).searchParams.get("sig");
  if (!(await verifySig(env.SIGNING_SECRET, id, sig))) return json({ error: "Invalid upload link." }, 403);

  const row = await env.DB.prepare("SELECT * FROM uploads WHERE id = ? AND status = 'uploading'").bind(id).first();
  if (!row) return json({ error: "Upload not found or already completed." }, 404);

  const len = Number(request.headers.get("content-length"));
  if (!len || len !== row.size || request.headers.get("content-type") !== row.content_type) return json({ error: "File doesn't match what was declared." }, 400);

  await env.UPLOADS.put(row.r2_key, request.body, { httpMetadata: { contentType: row.content_type } });

  const head = await env.UPLOADS.get(row.r2_key, { range: { offset: 0, length: 12 } });
  const bytes = head ? new Uint8Array(await head.arrayBuffer()) : new Uint8Array();
  if (!head || head.size !== row.size || !sniff(bytes, row.kind)) {
    await env.UPLOADS.delete(row.r2_key);
    await env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(id).run();
    return json({ error: "That file doesn't look like a valid photo or video." }, 400);
  }
  await env.DB.prepare("UPDATE uploads SET status = 'pending' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
