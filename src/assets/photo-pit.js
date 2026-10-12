// Fan uploads: compress photos in-browser (also strips GPS/EXIF), cap videos, upload via signed slots.
const MAX_VIDEO = 90 * 1024 * 1024, MAX_SECONDS = 61, MAX_FILES = 5;
const $ = (s) => document.querySelector(s);
const gallery = $("#gallery"), form = $("#upload-form"), log = $("#upload-log");

// ---------- gallery ----------
(async () => {
  if (!gallery) return;
  try {
    const { items } = await (await fetch("/api/gallery")).json();
    if (!items?.length) { gallery.innerHTML = '<p class="tbd">No fan pics yet. Be the first. Upload yours below!</p>'; return; }
    gallery.innerHTML = "";
    for (const it of items) {
      const li = document.createElement("li");
      li.className = "tile";
      const media = it.kind === "video"
        ? `<video src="/media/${it.id}#t=0.1" preload="metadata" controls playsinline></video>`
        : `<img src="/media/${it.id}" loading="lazy" alt="${esc(it.caption || "Fan photo from a Twurt show")}">`;
      const credit = [it.show_name, it.name && `by ${it.name}`].filter(Boolean).join(" · ");
      li.innerHTML = `${media}${it.caption || credit ? `<p>${esc(it.caption || "")}${it.caption && credit ? "<br>" : ""}<small>${esc(credit)}</small></p>` : ""}`;
      gallery.append(li);
    }
  } catch { gallery.innerHTML = '<p class="tbd">The gallery is warming up. Check back soon.</p>'; }
})();
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// ---------- prepare files ----------
async function prepPhoto(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => { throw new Error("couldn't read this photo. Try a JPEG or PNG"); });
  const s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("couldn't process this photo");
  return { blob, type: "image/jpeg" };
}
function prepVideo(file) {
  const type = file.type === "video/quicktime" || /\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4";
  if (file.size > MAX_VIDEO) throw new Error(`video is over ${MAX_VIDEO / 1048576} MB, so please trim it`);
  return new Promise((resolve, reject) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); v.duration > MAX_SECONDS ? reject(new Error("videos can be up to 60 seconds")) : resolve({ blob: file, type }); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: file, type }); }; // can't preview this codec here; size cap still applies
    v.src = url;
  });
}
const prep = (f) => (f.type.startsWith("video/") || /\.(mov|mp4)$/i.test(f.name) ? prepVideo(f) : prepPhoto(f));

function put(url, blob, type, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url); x.setRequestHeader("content-type", type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(JSON.parse(x.responseText || "{}").error || "upload failed")));
    x.onerror = () => reject(new Error("network error"));
    x.send(blob);
  });
}

// ---------- submit ----------
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]"), data = new FormData(form);
  const picked = [...form.files.files];
  log.innerHTML = "";
  if (!picked.length) return say("Choose at least one photo or video.", true);
  if (picked.length > MAX_FILES) return say(`Please choose up to ${MAX_FILES} files at a time.`, true);
  btn.disabled = true;
  try {
    const items = [];
    for (const f of picked) {
      say(`Preparing ${f.name}…`);
      try { items.push(await prep(f)); } catch (err) { throw new Error(`${f.name}: ${err.message}`); }
    }
    const res = await fetch("/api/upload-start", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent: data.get("consent") === "on", name: data.get("name"), show: data.get("show"), token: data.get("cf-turnstile-response"), files: items.map((i) => ({ type: i.type, size: i.blob.size })) }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || "Something went wrong.");
    for (let i = 0; i < items.length; i++) {
      const line = say(`Uploading ${picked[i].name}… 0%`);
      await put(`/api/upload/${out.slots[i].id}?sig=${out.slots[i].sig}`, items[i].blob, items[i].type, (p) => (line.textContent = `Uploading ${picked[i].name}… ${p}%`));
      line.textContent = `✓ ${picked[i].name} sent`;
    }
    say("Thank you! Twurt reviews every upload. If it's approved, it'll show up in the gallery.");
    form.reset();
  } catch (err) { say(err.message, true); }
  finally { btn.disabled = false; window.turnstile?.reset(); }
});
function say(msg, bad) {
  const p = document.createElement("p");
  p.textContent = msg; if (bad) p.className = "err";
  log.append(p); return p;
}
