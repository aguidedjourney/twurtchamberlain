// Opt-in entrance: fade out, remember the choice, walk through the gate.
const enter = document.querySelector("[data-enter]");
if (enter) {
  enter.addEventListener("click", (e) => {
    e.preventDefault();
    try { sessionStorage.setItem("twurt-entered", "1"); } catch {}
    document.body.classList.add("fade-out");
    setTimeout(() => (location.href = enter.href), 550);
  });
}

// Woods: expandable thoughts
document.querySelectorAll(".thought").forEach((b) =>
  b.addEventListener("click", () => b.setAttribute("aria-expanded", b.getAttribute("aria-expanded") !== "true"))
);

// Woods: fireflies
const cv = document.getElementById("fireflies");
if (cv && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ctx = cv.getContext("2d");
  let w, h, flies;
  const size = () => {
    w = cv.width = cv.offsetWidth; h = cv.height = cv.offsetHeight;
    flies = Array.from({ length: Math.round(w / 22) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2, a: Math.random() * 6.28, s: .2 + Math.random() * .4 }));
  };
  size(); addEventListener("resize", size);
  (function frame(t = 0) {
    ctx.clearRect(0, 0, w, h);
    for (const f of flies) {
      f.a += (Math.random() - .5) * .2; f.x = (f.x + Math.cos(f.a) * f.s + w) % w; f.y = (f.y + Math.sin(f.a) * f.s + h) % h;
      ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 700 + f.x));
      ctx.fillStyle = "#c8ff7a"; ctx.shadowColor = "#b6ff4a"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
    }
    requestAnimationFrame(frame);
  })();
}

// Drum circle booking form -> pre-filled email
const form = document.querySelector("form.book");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const body = `Name: ${d.name}\nOrganization: ${d.org || "-"}\nEvent type: ${d.type}\nDate: ${d.date || "flexible"}\nLocation: ${d.where || "-"}\n\n${d.msg || ""}`;
    location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent("Drum circle booking: " + d.type)}&body=${encodeURIComponent(body)}`;
  });
}
