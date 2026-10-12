// Static site generator: `node build.mjs` -> dist/. No dependencies.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const SITE = "https://twurtchamberlain.com";
const NAME = "Twurt Chamberlain";
const CONTACT = "booking@twurtchamberlain.com"; // TODO: confirm real booking address
const SAME_AS = []; // TODO: add Spotify / Instagram / YouTube profile URLs (boosts SEO knowledge-panel matching)
const TURNSTILE_SITEKEY = process.env.TURNSTILE_SITEKEY || "1x00000000000000000000AA"; // Cloudflare test key (always passes); set the real key as a Pages build variable
const OG = `${SITE}/assets/img/og.jpg`;

const BIO =
  "Twurt Chamberlain is a spirited musician from Lexington, Mississippi. He is a soulful vocalist and guitarist whose music is a fusion of blues, rock, and hip-hop. Twurt's revolutionary sound is matched by his uplifting and positive lyrics. He is an unconventional artist with Rockstar energy. Twurt has made it his mission to spread light and positivity through music from the Mississippi Delta to the rest of the world.";

const icon = (p) => `<svg viewBox="0 0 24 24" width="55%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

// Zones: x/y are pin positions as % of the map image.
const zones = [
  { slug: "stage", title: "The Sound Stage", nav: "Shows", c: "#ff3b30", x: 50, y: 13.5, d: 0,
    blurb: "Live shows & tour dates", icon: icon('<path d="M4 12v0M8 7v10M12 4v16M16 8v8M20 11v2"/>'),
    seo: "Twurt Chamberlain Live Shows & Tour Dates", desc: "Upcoming live shows and tour dates for Mississippi blues, rock and hip-hop singer-songwriter Twurt Chamberlain." },
  { slug: "dj-booth", title: "The DJ Booth", nav: "Music", c: "#ffd21f", x: 50, y: 42.7, d: .4,
    blurb: "Listen: Country Punk Black & more", icon: icon('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    seo: "Listen to Twurt Chamberlain — Country Punk Black", desc: "Stream Twurt Chamberlain's debut album Country Punk Black — blues, rock, soul and hip-hop from the Mississippi Delta." },
  { slug: "merch", title: "The Merch Stand", nav: "Merch", c: "#2fd25f", x: 18.7, y: 46.6, d: .8,
    blurb: "Shirts, gear & goods", icon: icon('<path d="M8 4 3 7l2 4 2-1v10h10V10l2 1 2-4-5-3a4 4 0 0 1-8 0Z"/>'),
    seo: "Twurt Chamberlain Merch", desc: "Official Twurt Chamberlain merchandise — shirts, gear and goods." },
  { slug: "drum-circle", title: "The Drum Circle", nav: "Book", c: "#f5b800", x: 78.8, y: 50.9, d: 1.2,
    blurb: "Book a community drum circle or jam", icon: icon('<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7Z"/>'),
    seo: "Book Twurt Chamberlain — Drum Circles & Jam Sessions", desc: "Book Twurt Chamberlain to host a community drum circle or jam session in Mississippi and beyond." },
  { slug: "woods", title: "The Woods", nav: "Mind", c: "#27c254", x: 14.7, y: 15.7, d: 1.6,
    blurb: "Wander in. Enter Twurt's mind.", icon: icon('<path d="m12 3 5 7h-3l4 6h-5v5h-2v-5H6l4-6H7Z"/>'),
    seo: "Into the Woods — Inside the Mind of Twurt Chamberlain", desc: "Wander into the woods and enter the mind of Twurt Chamberlain: thoughts, truth and recommended reading." },
  { slug: "junkyard", title: "The Junkyard", nav: "Oddities", c: "#e8392f", x: 88.9, y: 17.1, d: 2,
    blurb: "Photos, flyers & oddities", icon: icon('<path d="M3 20h14M5 20l3-9 6-6 3 3-4 5-4 7"/><path d="M14 5l5 5"/>'),
    seo: "The Junkyard — Photos, Old Flyers & Oddities from Twurt's World", desc: "Photos, old show flyers and random oddities from Twurt Chamberlain's world, added over time." },
  { slug: "photo-pit", title: "The Photo Pit", nav: "Fan Pics", c: "#ff5a4d", pin: false,
    blurb: "Fan photos & videos from the shows", icon: "",
    seo: "Fan Photos & Videos from Twurt Chamberlain Shows", desc: "Fan photos and video clips from Twurt Chamberlain shows. Share yours — approved uploads appear in the gallery." },
  { slug: "gate", title: "The Gate", nav: "About", c: "#2fd25f", x: 50, y: 74.3, d: 2.4,
    blurb: "Who is Twurt? Bio & contact", icon: icon('<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>'),
    seo: "About Twurt Chamberlain — Mississippi Blues, Rock & Hip-Hop Singer-Songwriter", desc: "Twurt Chamberlain is a soulful vocalist and guitarist from Lexington, Mississippi, fusing blues, rock and hip-hop. TWURT stands for The World's Most Unique Representation of Truth." },
];
const Z = Object.fromEntries(zones.map((z) => [z.slug, z]));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const person = {
  "@type": ["Person", "MusicGroup"], "@id": `${SITE}/#twurt`, name: NAME, alternateName: "TWURT",
  description: BIO, url: SITE, image: OG, genre: ["Blues", "Rock", "Soul", "Hip-hop"],
  homeLocation: { "@type": "Place", name: "Lexington, Mississippi" },
  ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
};
const album = { "@type": "MusicAlbum", name: "Country Punk Black", byArtist: { "@id": person["@id"] } };

function head({ title, desc, path, ld = [], extra = "", noindex = false }) {
  const url = SITE + path;
  const graph = { "@context": "https://schema.org", "@graph": [person, ...ld] };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ""}
<meta name="theme-color" content="#050505">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/style.css">
${extra}<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>`;
}

function crumbs(z) {
  return { "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Festival Map", item: `${SITE}/festival/` },
    { "@type": "ListItem", position: 2, name: z.title, item: `${SITE}/${z.slug}/` } ] };
}

// ---------- landing ----------
const landing = `${head({
  title: `${NAME} | Mississippi Blues, Rock & Hip-Hop Singer-Songwriter`,
  desc: "Official site of Twurt Chamberlain, soulful vocalist and guitarist from Lexington, Mississippi. Enter the festival for shows, music, merch, drum circles and more.",
  path: "/",
  extra: `<link rel="preload" as="image" href="/assets/img/entrance.webp">\n`,
  ld: [{ "@type": "WebSite", "@id": `${SITE}/#site`, url: SITE, name: NAME, publisher: { "@id": person["@id"] } }, album],
})}
<body>
<a class="skip" href="#enter">Skip to enter</a>
<header class="landing">
  <img class="landing__bg" src="/assets/img/entrance.webp" width="1254" height="1254" alt="The glowing Twurt sign above the festival entrance on a snowy night" fetchpriority="high">
  <div class="landing__inner">
    <h1 class="sr-only">${NAME} — Mississippi blues, rock &amp; hip-hop singer-songwriter</h1>
    <p class="tag">Krazy groovy vibes on the frequency of truth.</p>
    <a id="enter" class="btn" data-enter href="/festival/">Enter the Festival</a>
    <p class="fine">Funky lights, loud sound, good vibes ahead. <a href="#about">Just want the bio?</a></p>
  </div>
</header>
<main id="about" class="content" style="padding-top:3rem">
  <h2>About Twurt Chamberlain</h2>
  <p>${BIO}</p>
  <p>TWURT is both a stage-name and an acronym for &ldquo;The World's Most Unique Representation of Truth.&rdquo; Whether you catch Twurt performing with his band or as a solo act, expect to be inspired by the truth and authenticity in his lyrics and performance style.</p>
  <p><a href="/festival/">Step inside the festival &rarr;</a></p>
</main>
<footer class="pagefoot"><span>&copy; ${new Date().getFullYear()} ${NAME}</span><span>Lexington, Mississippi</span></footer>
<script src="/assets/site.js" defer></script>
</body></html>`;

// ---------- map ----------
const pins = zones.filter((z) => z.pin !== false).map((z) => `<a class="pin" href="/${z.slug}/" style="left:${z.x}%;top:${z.y}%;--c:${z.c};--d:${z.d}s;background:rgba(7,6,11,.82);border:2px solid ${z.c}" aria-label="${z.title}: ${z.blurb}">${z.icon}<span class="lbl">${z.nav}</span></a>`).join("\n    ");
const zlist = zones.map((z) => `<li><a href="/${z.slug}/" style="--c:${z.c}"><strong>${z.title}</strong><small>${z.blurb}</small></a></li>`).join("\n    ");

const siteNav = (cur) => `<header class="site-head"><a href="/festival/" aria-label="Festival map"><img src="/assets/img/twurt-logo.png" width="88" height="34" alt="${NAME}"></a>
  <nav aria-label="Festival">${zones.map((z) => `<a href="/${z.slug}/"${z.slug === cur ? ' aria-current="page"' : ""}>${z.nav}</a>`).join("")}</nav></header>`;

const festival = `${head({
  title: `The Festival Map | ${NAME}`,
  desc: "Explore Twurt Chamberlain's festival: the sound stage for live shows, the DJ booth for music, the merch stand, the drum circle, the woods and the junkyard.",
  path: "/festival/",
  extra: `<link rel="preload" as="image" href="/assets/img/festival-map.webp">\n`,
})}
<body>
${siteNav("")}
<main class="mapwrap">
  <h1>Welcome to Twurt's Krazy World</h1>
  <p class="lede">Tap anything that's glowing. Every light on this map is a krazy new corner of Twurt's world.</p>
  <div class="map">
    <img src="/assets/img/festival-map.webp" width="1254" height="1254" alt="Night-time aerial map of the festival grounds: sound stage, DJ booth, merch stand, drum circle tent, woods, junkyard and entrance gate" fetchpriority="high">
    ${pins}
  </div>
  <ul class="zones">
    ${zlist}
  </ul>
</main>
<footer class="pagefoot"><a href="/">&larr; Back to the entrance</a><span>&copy; ${new Date().getFullYear()} ${NAME}</span></footer>
<script src="/assets/site.js" defer></script>
</body></html>`;

// ---------- zone pages ----------
function zonePage(z, kicker, h1, lead, body, ld = [], extraHead = "") {
  return `${head({ title: `${z.seo} | ${NAME}`, desc: z.desc, path: `/${z.slug}/`, ld: [crumbs(z), ...ld], extra: extraHead })}
<body class="zone" style="--c:${z.c}">
<a class="skip" href="#main">Skip to content</a>
${siteNav(z.slug)}
<section class="hero ${z.slug === "woods" ? "woods-hero" : ""}">${z.slug === "woods" ? '<canvas id="fireflies" aria-hidden="true"></canvas>' : ""}
  <p class="kicker">${kicker}</p><h1>${h1}</h1><p>${lead}</p>
</section>
<main id="main" class="content">
  <a class="back" href="/festival/">&larr; Back to the festival map</a>
${body}
</main>
<footer class="pagefoot"><a href="/festival/">&larr; Festival map</a><span>&copy; ${new Date().getFullYear()} ${NAME}</span></footer>
<script src="/assets/site.js" defer></script>
</body></html>`;
}

// TODO: replace with real dates. Shows are plain HTML so search engines can read them.
const shows = [];
const stage = zonePage(Z.stage, "Main Stage", "Live Shows", "Catch Twurt with the full band or as a solo act. Rockstar energy, groovy vibes, honest lyrics.",
  `  <h2>Upcoming shows</h2>
${shows.length ? shows.map((s) => `  <div class="show"><div class="date"><b>${s.day}</b>${s.mon}</div><div><h3>${s.venue}</h3><p>${s.city}</p></div><a class="btn" href="${s.url}">Tickets</a></div>`).join("\n") : `  <p class="tbd">The stage is being set. Show dates are dropping soon. Stay on the frequency, or <a href="/drum-circle/">book Twurt</a> for your event.</p>`}
  <h2>Bring Twurt to you</h2>
  <p>Full band, solo acoustic, festivals, venues and private events. <a href="/drum-circle/">Get in touch through the Drum Circle &rarr;</a></p>`);

const platforms = ["Spotify", "Apple Music", "YouTube", "Bandcamp"]; // TODO: real URLs
const djbooth = zonePage(Z["dj-booth"], "DJ Booth", "Tune In", "Funky blues, rock, soul and hip-hop, straight from the Mississippi Delta. Turn it up.",
  `  <h2>Country Punk Black</h2>
  <p>The debut album from Twurt Chamberlain: a fusion of blues, rock and hip-hop with uplifting, truth-driven lyrics.</p>
  <div class="linkrow">${platforms.map((p) => `<a class="btn" href="#" rel="noopener">${p}</a>`).join("")}</div>
  <p class="tbd">Streaming links are being wired up.</p>`, [album]);

const merch = zonePage(Z.merch, "Merch Stand", "Wear the Vibes", "Shirts, gear and goods with a whole lotta funk, straight from the festival.",
  `  <h2>The racks</h2>
  <ul class="cards">${["Tees", "Hoodies", "Hats", "Stickers & Goods"].map((n) => `<li class="card"><div class="thumb">photo soon</div><h3>${n}</h3><p class="meta">Coming soon</p></li>`).join("")}</ul>
  <div class="linkrow"><a class="btn" href="#">Shop all merch</a></div>
  <p class="tbd">Store link goes here once the shop is live.</p>`);

const drum = zonePage(Z["drum-circle"], "Drum Circle", "Come Make Some Krazy Noise", "Book Twurt to host a community drum circle or jam session. All ages, all levels, no experience needed, just bring your good vibes.",
  `  <h2>Book a circle</h2>
  <p>Community centers, schools, festivals, retreats, corporate events and backyard gatherings. Tell us what you have in mind.</p>
  <form class="book" data-to="${CONTACT}">
    <label>Your name<input name="name" required autocomplete="name"></label>
    <label>Organization (optional)<input name="org" autocomplete="organization"></label>
    <label>Type of event<select name="type"><option>Community drum circle</option><option>Jam session</option><option>Live show</option><option>Other</option></select></label>
    <label>Preferred date<input name="date" type="date"></label>
    <label>Location<input name="where" placeholder="City, State"></label>
    <label>Anything else?<textarea name="msg"></textarea></label>
    <button class="btn" type="submit">Send the request</button>
  </form>
  <noscript><p>Email <a href="mailto:${CONTACT}">${CONTACT}</a> to book.</p></noscript>`);

const thoughts = [
  ["What is truth?", "TWURT: The World's Most Unique Representation of Truth. Not a slogan, a practice. Say the real thing, kindly, and you're already on the frequency."],
  ["Why light?", "Twurt's mission: spread light, positivity and good vibes from the Mississippi Delta to the rest of the world."],
  ["Where does the sound come from?", "Blues, rock, soul and hip-hop all grew up on the same roads. Twurt just lets them sit at the same table and get funky."],
];
const woods = zonePage(Z.woods, "The Woods", "Enter Twurt's Mind", "Follow the lights off the path. Open a thought. Find your frequency.",
  `  <h2>Thoughts on the trail</h2>
  <p>Tap a thought to see where it leads.</p>
  <div class="thoughts">${thoughts.map(([q, a]) => `<button class="thought" aria-expanded="false">${q}<span class="reveal">${a}</span></button>`).join("")}</div>
  <h2>Recommended reading</h2>
  <p class="tbd">Twurt's reading shelf is being stocked. Check back soon for the books that shaped his mind.</p>`);

const junk = zonePage(Z.junkyard, "The Junkyard", "Oddities & Artifacts", "Photos, old show flyers and krazy random things Twurt decides to share, added over time.",
  `  <h2>Found objects</h2>
  <ul class="cards">${["Photos", "Old show flyers", "Random oddities"].map((n) => `<li class="card"><div class="thumb">first finds soon</div><h3>${n}</h3><p class="meta">Digging&hellip;</p></li>`).join("")}</ul>
  <p class="tbd">The junkyard fills up as Twurt shares more. Come back often.</p>`);

const gate = zonePage(Z.gate, "The Gate", "Who Is Twurt?", "Soulful vocalist and guitarist from Lexington, Mississippi.",
  `  <h2>Bio</h2>
  <p>${BIO}</p>
  <p>TWURT is both a stage-name and an acronym for &ldquo;The World's Most Unique Representation of Truth.&rdquo; Whether you catch Twurt performing with his band or as a solo act, expect to be inspired by the truth and authenticity in his lyrics and performance style.</p>
  <h2>Contact &amp; booking</h2>
  <p><a href="mailto:${CONTACT}">${CONTACT}</a></p>`, [{ "@type": "ProfilePage", mainEntity: { "@id": person["@id"] } }]);


const photopit = zonePage(Z["photo-pit"], "The Photo Pit", "Fan Pics & Clips", "Got a groovy photo or video from a show? Share the vibes. Twurt looks at every upload before it goes up.",
  `  <h2>The wall</h2>
  <ul id="gallery" class="gallery" aria-live="polite"><li class="tbd">Loading the wall&hellip;</li></ul>
  <noscript><p class="tbd">The fan gallery needs JavaScript.</p></noscript>
  <h2>Add yours</h2>
  <p>Photos or short clips (up to 60 seconds). Nothing appears publicly until Twurt approves it.</p>
  <form id="upload-form" class="book">
    <label>Photos or videos (up to 5)<input name="files" id="files" type="file" multiple accept="image/*,video/mp4,video/quicktime" required></label>
    <label>Which show? (optional)<input name="show" maxlength="80" placeholder="Venue, city, date"></label>
    <label>Name for credit (optional)<input name="name" maxlength="60" autocomplete="name"></label>
    <label class="chk"><input type="checkbox" name="consent" required><span>I took this (or have permission to share it), and I give Twurt Chamberlain permission to display it on this website and his social channels. I can ask for removal anytime.</span></label>
    <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITEKEY}" data-theme="dark"></div>
    <button class="btn" type="submit">Send for approval</button>
    <div id="upload-log" aria-live="polite"></div>
  </form>
  <h2>House rules</h2>
  <p>Keep the vibes good and keep it real: no nudity, hate or harassment, and please don't upload photos of people who wouldn't want them shared. Photos are resized in your browser and location data is removed. To request removal of something you see here, email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
  [], `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n<script type="module" src="/assets/photo-pit.js"></script>\n`);

// Admin queue: protected by Cloudflare Access, never indexed.
const admin = `${head({ title: "Moderation | Twurt Chamberlain", desc: "Private moderation queue.", path: "/admin/", noindex: true })}
<body class="zone" style="--c:#ffd21f">
<main class="content">
  <h1>Fan upload queue</h1>
  <div class="tabs"><button class="btn btn--ghost" data-tab="pending" aria-pressed="true">Waiting</button><button class="btn btn--ghost" data-tab="approved" aria-pressed="false">Published</button></div>
  <ul id="queue" class="cards"></ul>
</main>
<script type="module" src="/assets/admin.js"></script>
</body></html>`;

// ---------- write ----------
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("src/assets", "dist/assets", { recursive: true });
const out = (p, c) => { mkdirSync(`dist/${p}`, { recursive: true }); writeFileSync(`dist/${p}${p ? "/" : ""}index.html`, c); };
out("", landing); out("festival", festival);
out("admin", admin);
const pages = { "photo-pit": photopit, stage, "dj-booth": djbooth, merch, "drum-circle": drum, woods, junkyard: junk, gate };
for (const [k, v] of Object.entries(pages)) out(k, v);

const urls = ["/", "/festival/", ...zones.map((z) => `/${z.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync("dist/_headers", `/assets/*\n  Cache-Control: public, max-age=86400\n\n/admin/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
console.log(`Built ${urls.length} pages -> dist/`);
