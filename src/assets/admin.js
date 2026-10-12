// Moderation queue (protected by Cloudflare Access).
const list = document.getElementById("queue"), tabs = document.querySelectorAll("[data-tab]");
let tab = "pending";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const api = (path, opts) => fetch(path, opts).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText); return r.json(); });

async function load() {
  list.innerHTML = "<p>Loading…</p>";
  try {
    const { items } = await api(`/api/admin/list?status=${tab}`);
    if (!items.length) { list.innerHTML = `<p class="tbd">Nothing ${tab === "pending" ? "waiting for review" : "published yet"}.</p>`; return; }
    list.innerHTML = "";
    for (const it of items) {
      const li = document.createElement("li");
      li.className = "card";
      const src = `/api/admin/media/${it.id}`;
      li.innerHTML = `${it.kind === "video" ? `<video src="${src}" controls playsinline preload="metadata"></video>` : `<img src="${src}" alt="">`}
        <p class="meta">${it.kind} · ${(it.size / 1048576).toFixed(1)} MB · ${new Date(it.created_at).toLocaleString()}</p>
        <p>${esc(it.show_name) || "<em>no show given</em>"}${it.name ? ` · by ${esc(it.name)}` : ""}</p>
        <label class="sr-only" for="c-${it.id}">Caption</label><input id="c-${it.id}" class="cap" placeholder="Caption (optional)" maxlength="200" value="${esc(it.caption)}">
        <div class="linkrow">${tab === "pending"
          ? `<button class="btn" data-a="approve">Approve</button><button class="btn btn--ghost" data-a="reject">Reject</button>`
          : `<button class="btn btn--ghost" data-a="unpublish">Unpublish</button><button class="btn btn--ghost" data-a="reject">Delete</button>`}</div>`;
      li.addEventListener("click", async (e) => {
        const a = e.target.dataset?.a; if (!a) return;
        if (a === "reject" && !confirm("Permanently delete this file?")) return;
        e.target.disabled = true;
        try { await api("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: it.id, action: a, caption: li.querySelector(".cap").value }) }); li.remove(); }
        catch (err) { alert(err.message); e.target.disabled = false; }
      });
      list.append(li);
    }
  } catch (err) { list.innerHTML = `<p class="tbd">Couldn't load: ${esc(err.message)}. (If this says Unauthorized, check the Access setup.)</p>`; }
}
tabs.forEach((t) => t.addEventListener("click", () => { tab = t.dataset.tab; tabs.forEach((x) => x.setAttribute("aria-pressed", x === t)); load(); }));
load();
