/* =========================================================================
   Medicines by Class – static site builder
   Reads the five sheet CSVs, writes crawlable HTML into dist/.
       node src/build.mjs
   =========================================================================*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "sheets");
const DIST = path.join(ROOT, "dist");

const CFG = {
  origin: process.env.SITE_ORIGIN || "https://pharmeasy.in",
  base: process.env.SITE_BASE || "/medicines-by-class",
  assets: process.env.ASSET_BASE || "/medicines-by-class/assets",
  pdpBase: "/online-medicine-order",
  // {id} is substituted per card. Point this at the PHP proxy when the pages
  // are not served from a pharmeasy.in origin -- the API only sends
  // Access-Control-Allow-Origin back to pharmeasy.in hosts.
  priceApi: process.env.PRICE_API || "https://api.pharmeasy.in/v5/product-details/{id}/dynamic",
  perPage: 24,
  minSubclassPage: 8,
  reviewer: "Reviewed by medical experts",
  cartUrl: process.env.CART_URL || "https://pharmeasy.in/cart?src=header",
  // Real cart API, reverse-engineered from the PDP bundle:
  //   POST {cartApi}/cart/addToCart  {productId, productType, productName, quantity}
  //   GET  {cartApi}/cart/getCartCount
  // Same-origin on pharmeasy.in, and addToCart needs a logged-in session (401 otherwise).
  cartApi: process.env.CART_API || "https://pharmeasy.in/api",
  loginUrl: process.env.LOGIN_URL || "https://pharmeasy.in/login",
  // Standing extra discount folded into the displayed price. Set to 0 to turn
  // the whole thing off in one place if the offer ends.
  extraOffPct: Number(process.env.EXTRA_OFF_PCT ?? 15),
  tncUrl: process.env.TNC_URL || "/offers-terms",
};

/* ------------------------------------------------------------------ csv -- */
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.some(v => v !== "")).map(r =>
    Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}
const sheet = n => parseCSV(fs.readFileSync(path.join(SHEETS, n), "utf8"));
const bool = v => String(v).toUpperCase() === "TRUE";

/* ----------------------------------------------------------------- html -- */
const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Deliberately tiny Markdown: **bold**, blank-line paragraphs, 1. lists.
 *  Everything is escaped first, so a sheet editor cannot inject HTML. */
function md(src, { inline = false } = {}) {
  if (!src) return "";
  const strong = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  if (inline) return strong(src.replace(/\n+/g, " "));
  return src.split(/\n\s*\n/).map(block => {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length && lines.every(l => /^\d+\.\s/.test(l))) {
      return `<ol>${lines.map(l => `<li>${strong(l.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ol>`;
    }
    return `<p>${strong(lines.join(" "))}</p>`;
  }).join("\n");
}
const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);
const rupee = n => "₹" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
const slugify = s => s.toLowerCase().replace(/'/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------------------------------------------------------------- icons -- */
const I = {
  droplet: '<path d="M12 3.2S6.2 9.4 6.2 13.6a5.8 5.8 0 0 0 11.6 0C17.8 9.4 12 3.2 12 3.2z"/>',
  pulse: '<path d="M3 12h4l2-4 3 8 2.4-4H21"/>',
  heart: '<path d="M12 20s-7.4-4.4-7.4-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7.4 2.6c0 5-7.4 9.4-7.4 9.4z"/>',
  trend: '<path d="M4 18l5-5 3.2 2.6L20 7"/><polyline points="15.6 7 20 7 20 11.4"/>',
  capsule: '<rect x="3.2" y="9" width="17.6" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/>',
  shield: '<path d="M12 3.4l7.2 3v5.2c0 4.3-3 7.6-7.2 9-4.2-1.4-7.2-4.7-7.2-9V6.4z"/>',
  allergy: '<path d="M4 15c3-1 4-4 4-7"/><path d="M20 9c-3 1-4 4-4 7"/><circle cx="12" cy="12" r="2.4"/>',
  thyroid: '<path d="M8 4.4c0 2.6 1.8 3.4 4 3.4s4-.8 4-3.4"/><path d="M12 7.8v4"/><path d="M12 11.8c-2.6 0-4.6 2-4.6 4.4S9 20.4 12 20.4s4.6-1.8 4.6-4.2-2-4.4-4.6-4.4z"/>',
  stomach: '<path d="M9 4h6v3.4c0 3.2 3.4 4.4 3.4 8.2A4.4 4.4 0 0 1 14 20H10a4.4 4.4 0 0 1-4.4-4.4C5.6 11.8 9 10.6 9 7.4z"/>',
  lungs: '<path d="M12 20V9"/><path d="M12 9C12 6 9.6 4 6.8 4 5.6 4 5 4.8 5 6c0 3 3 5 7 5z"/><path d="M12 11c4 0 7-2 7-5 0-1.2-.6-2-1.8-2C14.4 4 12 6 12 9z"/>',
  skin: '<path d="M12 4.6c3.6 0 6.6 2.6 6.6 5.8 0 4.4-4.2 5.4-4.6 9H10c-.4-3.6-4.6-4.6-4.6-9 0-3.2 3-5.8 6.6-5.8z"/>',
  star: '<path d="M12 4.2l2.3 4.7 5.2.7-3.8 3.6.9 5.1-4.6-2.5-4.6 2.5.9-5.1L4.5 9.6l5.2-.7z"/>',
  brain: '<path d="M9.5 4.5A2.8 2.8 0 0 0 6.8 8a3 3 0 0 0-1 4.6A3 3 0 0 0 8 17.4a2.7 2.7 0 0 0 4 1.6V5.6a2.6 2.6 0 0 0-2.5-1.1z"/><path d="M14.5 4.5A2.8 2.8 0 0 1 17.2 8a3 3 0 0 1 1 4.6A3 3 0 0 1 16 17.4"/>',
  nerve: '<path d="M4 6c3 0 3 5 6 5s3-5 6-5 4 2 4 2"/><path d="M4 18c3 0 3-5 6-5"/><circle cx="19" cy="17" r="2"/>',
  head: '<path d="M15.5 20v-2.4c2-1 3.3-3.1 3.3-5.5a6.8 6.8 0 1 0-13.6 0c0 1.4.4 2.4 1.2 3.4"/><path d="M8.4 15.5V20"/>',
  bone: '<path d="M7.5 4.5a2 2 0 1 0-2.6 2.9l7.7 7.7a2 2 0 1 0 2.9-2.6z"/><path d="M16.5 19.5a2 2 0 1 0 2.6-2.9"/>',
  joint: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><path d="M10 10l4 4"/>',
  muscle: '<path d="M5 9c2-3 6-4 9-3 3 1 5 4 5 7 0 3-2 5-5 5H8a3 3 0 0 1-3-3z"/><path d="M9 12h5"/>',
  syrup: '<path d="M9 3h6v3l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3z"/><path d="M7 13h10"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  spore: '<circle cx="12" cy="13" r="4.5"/><path d="M12 8.5V3"/><path d="M8 5.5h8"/>',
  syringe: '<path d="M14 4l6 6"/><path d="M17.5 6.5L11 13l-3 5-2-2 5-3z"/><path d="M5 19l-1 1"/>',
  ribbon: '<path d="M12 14c3-3 4-5 4-7a4 4 0 1 0-8 0c0 2 1 4 4 7z"/><path d="M10 13l-3 8 5-3 5 3-3-8"/>',
  liver: '<path d="M4 8c4-2 12-2 16 1 0 5-3 9-7 9-3 0-4-2-6-3S4 12 4 8z"/><path d="M11 10c1 2 3 3 5 3"/>',
  kidney: '<path d="M9 4c3 0 4 3 4 6s1 4 3 4c-1 3-4 6-7 6-3 0-5-3-5-8s2-8 5-8z"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  blood: '<path d="M12 3.2S6.2 9.4 6.2 13.6a5.8 5.8 0 0 0 11.6 0C17.8 9.4 12 3.2 12 3.2z"/><path d="M9.5 13.5h5"/>',
  female: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>',
  male: '<circle cx="10" cy="14" r="5"/><path d="M14.5 9.5L20 4M15 4h5v5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5z"/>',
  scale: '<path d="M12 4v16"/><path d="M5 8h14"/><path d="M5 8l-2.5 6h5z"/><path d="M19 8l-2.5 6h5z"/>',
  vial: '<path d="M9 3h6"/><path d="M10 3v10l-2.5 4A2.5 2.5 0 0 0 9.6 21h4.8a2.5 2.5 0 0 0 2.1-3.9L14 13V3"/>',
  numb: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  "shield-half": '<path d="M12 3.4l7.2 3v5.2c0 4.3-3 7.6-7.2 9-4.2-1.4-7.2-4.7-7.2-9V6.4z"/><path d="M12 3.4v17.2"/>',
  "drop-slash": '<path d="M12 3.2S6.2 9.4 6.2 13.6a5.8 5.8 0 0 0 11.6 0C17.8 9.4 12 3.2 12 3.2z"/><path d="M5 19L19 5"/>',
  pill: '<rect x="3.2" y="9" width="17.6" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/>',
};
const icon = (k, size = 21, sw = 1.9) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k] || I.pill}</svg>`;
const chev = (s = 14, sw = 2.4, pts = "9 18 15 12 9 6") =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${pts}"/></svg>`;
const chevDown = (s = 20, sw = 2.4) => chev(s, sw, "6 9 12 15 18 9");
const tick = (s = 18, sw = 2.4) => chev(s, sw, "4 12.5 9.5 18 20 6.5");


/* design-v2: category -> [pastel tile tint, accent] */
const CATS = {
  "Diabetes care": ["#E4F4EF", "#0E8A7D"], "Heart health": ["#FCEBEF", "#CE4F69"],
  "Infection care": ["#FBF3DC", "#A97C26"], "Pain care": ["#EFEDFB", "#6558C0"],
  "Allergy care": ["#E5F0FC", "#3579BE"], "Respiratory care": ["#E6F4EE", "#2A8567"],
  "Digestive care": ["#FCEFE4", "#BB6F36"], "Hormone care": ["#EDF5E2", "#5A882F"],
  "Neurology care": ["#E9ECFA", "#4859B0"], "Mental wellness": ["#E7F3F1", "#297A73"],
  "Men's health": ["#E7EFFA", "#3A69A9"], "Women's health": ["#FBEBF3", "#AE4E80"],
  "Bone health": ["#ECF2E7", "#5A8547"], "Skin care": ["#FCEDE9", "#BE644D"],
  "Eye & ear care": ["#E6F1FB", "#37799F"], "Kidney care": ["#E4F2F2", "#257C82"],
  "Liver care": ["#F3F0E1", "#84742B"], "Blood health": ["#FAEBEB", "#B9524C"],
  "Immunity care": ["#E8F1ED", "#377A5F"], "Nutrition": ["#FBF2DF", "#AF802C"],
  "Dental care": ["#ECF0F6", "#556C90"], "Cancer care": ["#F0EAF6", "#6D4B93"],
};
const cat = c => CATS[c] || ["#EEF2F6", "#5C6773"];

/* ------------------------------------------------------------ chrome ----- */
// [label, slug] – slugs are the live pharmeasy.in paths, not derived from the label
const NAV = [["Medicine", "medicine"], ["Healthcare", "healthcare"],
  ["Doctor Consult", "online-doctor-consultation"], ["Lab Tests", "lab-tests"],
  ["PLUS", "plus"], ["Health Insights", "health-insights"], ["Offers", "offers"]];
const LOGO = "https://assets.pharmeasy.in/apothecary/images/logo_big.svg";

const FOOTER_COLS = [
  [["Company", ["About Us", "Careers", "Blog", "Partner with PharmEasy"]],
   ["Our Services", ["Order Medicine", "Healthcare Products", "Lab Tests"]]],
  [["Featured Categories", ["Health Must Haves", "Personal Care", "Healthcare Devices",
    "Vitamins & Supplements", "Sports Nutrition", "Homeopathy Care", "Health Food and Drinks",
    "Sexual Wellness", "Diabetes Essentials", "Ayurvedic Care", "Mother and Baby Care",
    "Mobility & Elderly Care", "Skin Care", "Pet Care", "Health Concern", "Explore More"]]],
  [["Need Help", ["Browse All Medicines", "Browse All Molecules", "Browse All Cities",
    "Browse All Stores", "FAQs"]],
   ["Policy Info", ["Editorial Policy", "Privacy Policy", "Vulnerability Disclosure Policy",
    "Terms and conditions", "Declaration on Dark Pattern", "Customer Support Policy",
    "Return Policy", "Smartbuy Policy"]]],
];
const PAY = [
  ["gpay", "Google Pay"], ["paytm", "Paytm"], ["amazon-pay", "Amazon Pay"],
  ["phonepe", "PhonePe"], ["mobikwik", "Mobikwik"], ["airtel-money", "Airtel Money"],
  ["ola-money", "Ola Money"], ["maestro", "Maestro"], ["mastercard", "Mastercard"],
  ["visa", "Visa"], ["rupay", "Rupay"], ["diners", "Diners"],
];
const PAY_BASE = "https://assets.pharmeasy.in/web-assets/_next/icons";

const SOCIAL = {
  Instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/>',
  Facebook: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>',
  YouTube: '<path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 9 2 12 2 12s0 3 .4 4.8a2.6 2.6 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8C22 15 22 12 22 12s0-3-.4-4.8zM10 15.2V8.8L15.5 12z"/>',
  Twitter: '<path d="M22 5.9c-.7.3-1.5.6-2.3.7a3.7 3.7 0 0 0 1.6-2 7.4 7.4 0 0 1-2.3.9 3.6 3.6 0 0 0-6.2 3.3A10.3 10.3 0 0 1 3.3 5a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.2-.2-1.7-.5a3.6 3.6 0 0 0 2.9 3.6c-.6.2-1.2.2-1.8.1a3.6 3.6 0 0 0 3.4 2.5A7.3 7.3 0 0 1 2 17.1a10.3 10.3 0 0 0 15.9-9.2c.8-.6 1.5-1.3 2.1-2z"/>',
};

const CART_ICON = (s = 21) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3h2.2l2.6 11.2h10.4"/><path d="M6.4 6.6H21l-1.9 6.6H7.9"/><circle cx="9" cy="19.2" r="1.5"/><circle cx="17.4" cy="19.2" r="1.5"/></svg>`;

// design v2: one 76px white row – logo (with tagline), nav inline, cart right.
const NAV_CHEV = new Set(["Healthcare", "Lab Tests", "Health Insights"]);

const header = () => `
<header>
  <div class="hdr">
    <div class="hdr-top">
      <a class="hdr-logo" href="${CFG.origin}/" aria-label="PharmEasy home">
        <img src="${LOGO}" alt="PharmEasy" width="164" height="30">
      </a>
      <nav class="hdr-nav pe-scroll" aria-label="Primary">
        ${NAV.map(([n, slug], i) => `<a href="${CFG.origin}/${slug}"${i === 0 ? ' aria-current="page"' : ""}>${esc(n)}${NAV_CHEV.has(n) ? chevDown(13, 2.4) : ""}</a>`).join("\n        ")}
      </nav>
      <div class="hdr-spacer"></div>
      <a class="hdr-cart" href="${CFG.cartUrl}" data-cart-link>
        ${CART_ICON(21)}Cart<span class="cart-count" data-cart-count>0</span>
        <span class="sync-note" data-sync-note hidden></span>
      </a>
    </div>
  </div>

  <div class="mhdr">
    <div class="mhdr-row">
      <button type="button" class="mhdr-btn" aria-label="Open menu" aria-expanded="false" aria-controls="m-menu" data-menu-btn>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/><circle cx="18" cy="12" r="2.2"/></svg>
      </button>
      <a class="mhdr-logo" href="${CFG.origin}/" aria-label="PharmEasy home"><img src="${LOGO}" alt="PharmEasy" width="180" height="40"></a>
      <a class="mhdr-btn" href="${CFG.cartUrl}" aria-label="Cart" data-cart-link style="position:relative">
        ${CART_ICON(22)}<span class="cart-count" data-cart-count style="position:absolute;top:5px;right:3px">0</span>
      </a>
    </div>
    <nav class="mhdr-menu" id="m-menu" aria-label="Primary" hidden>
      ${NAV.map(([n, slug]) => `<a href="${CFG.origin}/${slug}">${esc(n)}${chev(15, 2.4)}</a>`).join("")}
    </nav>
  </div>
</header>`;

const footer = () => {
  let gid = 0;
  const group = ([title, links]) => {
    const id = `ft-${++gid}`;
    return `<div class="ft-group">
        <div class="ft-title"><button type="button" class="ft-toggle" aria-expanded="true" aria-controls="${id}">${esc(title)}<span class="ft-chev">${chevDown(18, 2)}</span></button></div>
        <ul class="ft-list" id="${id}">${links.map(l => `<li><a href="${CFG.origin}/">${esc(l)}</a></li>`).join("")}</ul>
      </div>`;
  };
  return `
<footer class="ft">
  <div class="ft-grid">
    ${FOOTER_COLS.map(col => `<div class="ft-col">${col.map(group).join("")}</div>`).join("\n    ")}
    <div class="ft-col">
      <div class="ft-social-title" style="font-size:17px;font-weight:700;color:var(--fg-1)">Follow Us On</div>
      <div class="ft-social">
        ${Object.entries(SOCIAL).map(([n, p]) =>
          `<a href="#" aria-label="${n}"><svg width="26" height="26" viewBox="0 0 24 24" fill="${n === "Instagram" ? "none" : "currentColor"}" stroke="${n === "Instagram" ? "currentColor" : "none"}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${p}</svg></a>`).join("")}
      </div>
    </div>
  </div>
  <div class="ft-pay">
    <div style="font-size:17px;font-weight:700;color:var(--fg-1)">Our Payment Partners</div>
    <div class="ft-pay-row">
      <div class="ft-pay-brands">${PAY.map(([f, alt]) => `<span class="pay-ico"><img src="${PAY_BASE}/${f}.svg" height="30" width="50" alt="${esc(alt)}" loading="lazy"></span>`).join("")}</div>
      <div class="ft-copy">© 2026 PharmEasy. All Rights Reserved</div>
    </div>
  </div>
</footer>
<button type="button" class="totop" aria-label="Back to top">${chev(16, 2.6, "6 14 12 8 18 14")}Back to top</button>`;
};

// credibility (reviewer / updated / policy) sits in the hero above the fold,
// so this strip carries the disclaimer only -- repeating it read as a bug.
const trust = () => `
<div class="trust">
  <p>Information on this page is intended for general awareness and should not replace professional medical advice, diagnosis or treatment.</p>
</div>`;

const faqBlock = (faqs, idPrefix) => faqs.map((f, i) => {
  const id = `${idPrefix}-a${i}`;
  const open = i === 0;
  return `<div class="faq-item">
      <button type="button" class="faq-q" aria-expanded="${open}" aria-controls="${id}">
        <span>${esc(f.question)}</span><span class="faq-chev">${chevDown(20)}</span>
      </button>
      <p class="faq-a" id="${id}"${open ? "" : " hidden"}>${md(f.answer_md, { inline: true })}</p>
    </div>`;
}).join("\n    ");

/* ---------------------------------------------------------------- schema --
   Shared graph nodes. Publisher + website are referenced by @id from every
   page rather than repeated inline, which keeps each page's JSON-LD small and
   lets Google resolve one canonical Organization.                            */
const ORG_ID = CFG.origin + "/#organization";
const SITE_ID = CFG.origin + "/#website";

const orgNode = () => ({
  "@type": ["Organization", "MedicalBusiness"],
  "@id": ORG_ID,
  name: "PharmEasy",
  url: CFG.origin + "/",
  logo: { "@type": "ImageObject", url: LOGO },
  sameAs: [
    "https://www.instagram.com/pharmeasy",
    "https://www.facebook.com/PharmEasyApp",
    "https://www.youtube.com/c/PharmEasy",
    "https://twitter.com/pharmeasyapp",
  ],
});

const siteNode = () => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  url: CFG.origin + "/",
  name: "PharmEasy",
  publisher: { "@id": ORG_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${CFG.origin}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

/** MedicalWebPage carries lastReviewed / reviewedBy, which is the pair Google
 *  documents for health content. Worth more here than any product markup. */
const medicalPageNode = ({ url, name, desc, reviewer, credentials, reviewed, updated, about }) => {
  const n = {
    "@type": "MedicalWebPage",
    "@id": url + "#webpage",
    url, name, description: desc,
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    audience: { "@type": "MedicalAudience", audienceType: "Patient" },
    specialty: "https://schema.org/Pharmacologic",
  };
  if (updated) { n.lastReviewed = updated; n.dateModified = updated; }
  if (reviewer) {
    n.reviewedBy = credentials
      ? { "@type": "Person", name: reviewer, jobTitle: credentials }
      : { "@type": "Organization", name: reviewer };
  }
  if (about) n.about = about;
  return n;
};

const graph = nodes => ({ "@context": "https://schema.org", "@graph": nodes });

const page = ({ title, desc, canonical, jsonld, body, extraHead = "" }) => `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.pharmeasy.in">
<link rel="stylesheet" href="${CFG.assets}/tokens.css">
<link rel="stylesheet" href="${CFG.assets}/styles.css">
${extraHead}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
${body}
<script>window.PE_CONFIG=${JSON.stringify({ priceApi: CFG.priceApi, extraOffPct: CFG.extraOffPct, cartUrl: CFG.cartUrl, cartApi: CFG.cartApi, loginUrl: CFG.loginUrl })};</script>
<script src="${CFG.assets}/app.js" defer></script>
</body>
</html>
`;

/* ================================================================= data == */
let classes = sheet("01_classes.csv").filter(c => c.status === "live");
const meds = sheet("02_medicines.csv").filter(m => m.status === "live");
const contentRows = Object.fromEntries(sheet("03_class_content.csv").map(r => [r.class_id, r]));
const faqRows = sheet("04_faqs.csv");
const faqsByClass = {};
for (const f of faqRows) (faqsByClass[f.class_id] ??= []).push(f);
Object.values(faqsByClass).forEach(a => a.sort((x, y) => +x.position - +y.position));

let snapshot = {};
const snapPath = path.join(ROOT, "data", "prices.json");
if (fs.existsSync(snapPath)) {
  snapshot = JSON.parse(fs.readFileSync(snapPath, "utf8")).items || {};
  console.log(`price snapshot     : ${Object.keys(snapshot).length.toLocaleString()} skus`);
} else {
  console.log("price snapshot     : none (run src/snapshot.mjs) – cards ship without a seed price");
}

const medsByClass = {};
for (const m of meds) {
  for (const cid of m.class_ids.split("|").filter(Boolean)) (medsByClass[cid] ??= []).push(m);
}
for (const list of Object.values(medsByClass)) list.sort((a, b) => (+a.sort_rank) - (+b.sort_rank));

/* "We do not sell this product" (tier 1) is a live signal, so a class can be
   gutted between builds. Filter first, then drop any class that falls under
   the publish threshold -- a 1-medicine class page is thin content. */
const sellable = m => { const s = snapshot[m.sku]; return !(s && s.tierType === 1); };
for (const cid of Object.keys(medsByClass)) medsByClass[cid] = medsByClass[cid].filter(sellable);

const dropped = classes.filter(c => (medsByClass[c.class_id]?.length || 0) < CFG.minSubclassPage);
if (dropped.length) {
  console.log(`unpublished (under ${CFG.minSubclassPage} sellable medicines):`);
  for (const c of dropped)
    console.log(`  ${String(medsByClass[c.class_id]?.length || 0).padStart(3)}  ${c.class_name}`);
}
const live = new Set(classes.filter(c => !dropped.includes(c)).map(c => c.class_id));
classes = classes.filter(c => live.has(c.class_id));

const byId = Object.fromEntries(classes.map(c => [c.class_id, c]));
const countOf = c => medsByClass[c.class_id]?.length || 0;

/* Shared with assets/app.js -- keep the two in step or the price will jump
   when the live call lands. */
function priceWithExtra(mrp, apiSale, apiPct) {
  if (!isFinite(mrp) || mrp <= 0 || !isFinite(apiSale) || apiSale <= 0) return { sale: NaN, off: 0 };
  let pct = Number(apiPct);
  if (!isFinite(pct)) pct = (1 - apiSale / mrp) * 100;   // derive if absent
  const off = Math.min(95, Math.round(pct + CFG.extraOffPct));
  return { sale: mrp * (1 - off / 100), off };
}

/* ================================================================ cards == */
function medCard(m) {
  // Commercial state comes from the dynamic API and nothing else. The
  // catalogue dump's MRP is deliberately NOT a fallback -- a stale catalogue
  // price is worse than no price, and the browser refreshes this anyway.
  const snap = snapshot[m.sku];
  const mrp = snap ? parseFloat(snap.mrp) : NaN;
  const apiSale = snap ? parseFloat(snap.sale) : NaN;
  // The extra is ADDITIVE on the API's own discount percentage, then taken off
  // MRP -- so 10% + 15 = 25% off MRP, not 0.90 x 0.85 (which would be 23.5%).
  const { sale, off } = priceWithExtra(mrp, apiSale, snap && snap.pct);
  const hasPrice = isFinite(sale) && sale > 0;
  // tier 1 = "We do not sell this product" -> never merchandise it
  const tierType = snap && snap.tierType != null ? snap.tierType : null;
  const discontinued = /discontinu/i.test((snap && snap.tierText) || "");
  const notSold = tierType === 1;
  const avail = notSold ? "notsold"
              : discontinued ? "discontinued"
              : snap ? (snap.avail ? "in" : "out") : "unknown";
  const stateLabel = notSold ? "Not available"
                   : discontinued ? "Discontinued"
                   : avail === "out" ? (snap && snap.notify ? "Notify me" : "Out of stock")
                   : "Add";
  const subst = snap ? (snap.subst ? "1" : "0") : "0";
  const ptype = snap && snap.ptype != null ? snap.ptype : 1;
  const href = `${CFG.origin}${CFG.pdpBase}/${m.slug}`;

  return `<article class="med" data-sku="${esc(m.sku)}" data-name="${esc(m.medicine_name)}" data-pack="${esc(m.pack_size)}" data-href="${esc(href)}" data-sub="${esc(m.sub_class)}" data-form="${esc(m.dosage_form)}" data-avail="${avail}" data-state="${esc((snap && snap.tierText) || "")}" data-subst="${subst}" data-ptype="${ptype}" data-rank="${esc(m.sort_rank)}" data-price="${hasPrice ? sale.toFixed(2) : ""}" data-off="${off}">
      <span class="badge-rx">${bool(m.rx_required) ? "Rx" : "OTC"}</span>
      <a class="med-name" href="${esc(href)}">${esc(m.medicine_name)}</a>
      ${m.manufacturer ? `<span class="med-by">By ${esc(m.manufacturer.toUpperCase())}</span>` : ""}
      <span class="med-pack">${esc(m.pack_size)}</span>
      <div class="med-foot">
        <span class="mrp"${off ? "" : " hidden"}>${isFinite(mrp) ? rupee(mrp) : ""}</span>
        <div class="price-row">
          <span class="price">${hasPrice ? rupee(sale) : "—"}</span>
          <span class="badge-off${off ? " on" : ""}">${off ? off + "% OFF" : ""}</span>
        </div>
        ${CFG.extraOffPct > 0 ? `<span class="med-coupon">with Coupon Discount <a class="tnc" href="${esc(CFG.tncUrl)}" rel="nofollow">T&amp;C</a></span>` : ""}
        <button type="button" class="btn-add"${avail === "in" ? "" : " disabled"}>${stateLabel === "Add" ? "Add to cart" : stateLabel}</button>
      </div>
    </article>`;
}

/* ============================================================= directory = */
function buildDirectory() {
  const c = contentRows._directory;
  const sorted = [...classes].sort((a, b) => a.class_name.localeCompare(b.class_name));
  const groups = [];
  for (const cl of sorted) {
    const L = cl.class_name[0].toUpperCase();
    if (!groups.length || groups.at(-1).letter !== L) groups.push({ letter: L, items: [] });
    groups.at(-1).items.push(cl);
  }
  const present = new Set(groups.map(g => g.letter));
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const popular = classes.filter(x => bool(x.is_popular))
    .sort((a, b) => (+a.popular_rank) - (+b.popular_rank));

  const faqs = faqsByClass._directory || [];
  const canonical = CFG.origin + CFG.base + "/";

  const body = `
${header()}
<main class="page" data-directory>
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol><li><a href="${CFG.origin}/">Home</a></li><li aria-hidden="true">›</li>
      <li><span aria-current="page">Medicines by Class</span></li></ol>
    </nav>

    <div class="hero">
      <div class="hero-art" aria-hidden="true">
        <span class="ha-circle"></span>
        <span class="ha-card"><i></i><i></i><i></i></span>
        <span class="ha-rx">Rx</span>
        <span class="ha-plus"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F07264" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg></span>
        <span class="ha-cap"><i></i><i></i></span>
      </div>
      <div class="hero-in">
        <div class="eyebrow-sm">Medicine directory</div>
        <h1>Medicines by Class</h1>
        <p class="hero-sub">${md(c.intro_md, { inline: true })}</p>
        <div class="field">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--teal-600)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
          <label class="vh" for="class-search">Search a medicine class</label>
          <input type="search" id="class-search" placeholder="Search a medicine class" autocomplete="off">
          <button type="button" class="field-clear" id="class-search-clear" aria-label="Clear search" hidden>×</button>
        </div>
        <p class="hero-note"><span data-count aria-live="polite">${classes.length} of ${classes.length} classes</span> · Medicine information is for general awareness. Always consult a qualified healthcare professional before starting or changing any medicine.</p>
        <div class="hero-cred">
          <span class="cred-by"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6l7 2.8v5c0 4.2-2.9 7.4-7 8.8-4.1-1.4-7-4.6-7-8.8v-5z"/><polyline points="8.8 12.2 11.2 14.6 15.4 10.2"/></svg>${esc(c.reviewer_name || CFG.reviewer)}</span>
          <span class="cred-sep"></span>
          <span class="cred-date">Last updated: ${esc(c.content_last_updated)}</span>
          <span class="cred-sep"></span>
          <a href="${CFG.origin}/editorial-policy">Editorial policy</a>
        </div>
      </div>
    </div>

    <section class="sec" data-popular>
      <div class="eyebrow-sm">Quick access</div>
      <h2>Popular medicine classes</h2>
      <div class="pop-grid">
        ${popular.map((p, i) => { const [tint, accent] = cat(p.category); return `<a class="pop-row${i >= 6 ? " m-extra" : ""}" style="--mo:${i + 1}" href="${CFG.origin}${CFG.base}/${p.slug}/">
          <span class="cls-tile" style="background:${tint};color:${accent}">${icon(p.icon, 20, 1.9)}</span>
          <span class="pop-main"><span class="pop-name">${esc(p.class_name)}</span><span class="pop-n">${countOf(p)} medicines</span></span>
          <span class="cls-go">${chev(16, 2.4)}</span>
        </a>`; }).join("\n        ")}
        <button type="button" class="pop-more">View all popular classes</button>
      </div>
    </section>

    <a class="bestmatch" data-bestmatch hidden href="#">
      <span class="bestmatch-l">Best match for <b data-bm-term></b></span>
      <span class="bestmatch-r"><b data-bm-name></b><span data-bm-count></span>${chev(16, 2.6)}</span>
    </a>

    <section class="sec">
      <div class="sec-head">
        <div>
          <div class="eyebrow-sm">A–Z directory</div>
          <h2>Browse all medicine classes</h2>
          <p>Every class links to its full medicine list.</p>
        </div>
        <span class="result-pill" data-result-pill>${classes.length} classes</span>
      </div>
      <div class="dir-card">
        <nav class="az pe-scroll" aria-label="Filter classes by letter">
          <button type="button" data-letter="" aria-pressed="true">All</button>
          ${ALPHA.map(L => `<button type="button" data-letter="${L}" aria-pressed="false"${present.has(L) ? "" : " disabled"}>${L}</button>`).join("")}
        </nav>
        <div class="groups">
          ${groups.map(g => `<section class="grp" data-letter="${g.letter}">
            <h3 class="grp-h"><button type="button" class="grp-btn" aria-expanded="true" aria-controls="grp-${g.letter}">
              <span class="grp-letter">${g.letter}<span class="grp-count">${g.items.length} ${g.items.length === 1 ? "class" : "classes"}</span></span>
              <span class="grp-rule"></span><span class="grp-chev">${chevDown(20)}</span></button></h3>
            <ul class="grp-list" id="grp-${g.letter}">
              ${g.items.map(it => { const [tint, accent] = cat(it.category); return `<li data-letter="${g.letter}" data-slug="${esc(it.slug)}" data-name="${esc(it.class_name)}" data-conditions="${esc((it.conditions || "").toLowerCase())}" data-search="${esc([it.class_name, it.synonyms, it.conditions, it.category].filter(Boolean).join("|").toLowerCase())}">
                <a class="cls-card" href="${CFG.origin}${CFG.base}/${it.slug}/">
                  <span class="cls-tile" style="background:${tint};color:${accent}">${icon(it.icon, 20, 1.9)}</span>
                  <span class="cls-body">
                    <span class="cls-cat" style="color:${accent}">${esc(it.category || "")}</span>
                    <span class="cls-name">${esc(it.class_name)}</span>
                    <span class="cls-desc">${esc(it.short_desc || "")}</span>
                    <span class="cls-n">${countOf(it)} medicines</span>
                  </span>
                  <span class="cls-go">${chev(16, 2.4)}</span>
                </a></li>`; }).join("\n              ")}
            </ul>
          </section>`).join("\n          ")}
        </div>
        <div class="empty" data-empty hidden>
          <div class="empty-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></div>
          <h3>No medicine class matches your search</h3>
          <p>Try a shorter term, or browse the full A–Z list instead.</p>
          <button type="button" class="btn-primary" data-reset>Show all classes</button>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <div class="card"><h2>${esc(c.about_heading)}</h2>${md(c.about_md)}</div>
      <div class="card"><h2>${esc(c.prescription_heading)}</h2>
        <ol class="steps">${lines(c.prescription_md).map((l, i) => {
          const t = l.replace(/^\d+\.\s*/, "");
          const [head, ...rest] = t.split("–");
          return `<li><span class="num">${i + 1}</span><span><span class="t">${md(head.trim(), { inline: true }).replace(/<\/?strong>/g, "")}</span><span class="d">${esc(rest.join("–").trim())}</span></span></li>`;
        }).join("")}</ol>
      </div>
      <div class="card"><h2>${esc(c.subclass_heading)}</h2>${md(c.subclass_md)}
        <div class="tiles">
          <div><b>Composition</b><span>Different active ingredients</span></div>
          <div><b>Strength</b><span>Different mg per dose</span></div>
          <div><b>Dosage form</b><span>Tablet, syrup, injection, cream</span></div>
          <div><b>Suitability</b><span>Age, pregnancy, other conditions</span></div>
          <div class="wide"><b>Prescription requirement</b><span>Some are available only against a valid prescription</span></div>
        </div>
      </div>
      <div class="card"><h2>Important Medicine Safety Information</h2>
        <ul class="checks">${lines(c.safety_bullets_md).map(b => `<li>${tick()}<span>${md(b, { inline: true })}</span></li>`).join("")}</ul>
      </div>
    </div>

    <section class="sec">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-card" style="margin-top:16px">${faqBlock(faqs, "d")}</div>
    </section>

    ${trust()}
  </div>
</main>
${footer()}`;

  const jsonld = [graph([
    orgNode(),
    siteNode(),
    medicalPageNode({
      url: canonical, name: "Medicines by Class", desc: c.meta_description,
      reviewer: c.reviewer_name || CFG.reviewer, credentials: c.reviewer_credentials,
      reviewed: c.medically_reviewed_on, updated: c.content_last_updated,
    }),
    { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: CFG.origin + "/" },
      { "@type": "ListItem", position: 2, name: "Medicines by Class", item: canonical }] },
    { "@type": "ItemList", "@id": canonical + "#classes",
      name: "Medicine classes", itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: classes.length,
      itemListElement: sorted.map((x, i) => ({ "@type": "ListItem", position: i + 1,
        name: x.class_name, url: CFG.origin + CFG.base + "/" + x.slug + "/" })) },
    ...(faqs.length ? [{ "@type": "FAQPage", "@id": canonical + "#faq",
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer_md } })) }] : []),
  ])];

  write("index.html", page({ title: c.meta_title, desc: c.meta_description, canonical, jsonld, body }));
  return canonical;
}

/* =========================================================== class page = */
function buildClass(cl) {
  const c = contentRows[cl.class_id] || {};
  const all = medsByClass[cl.class_id] || [];
  const total = all.length;
  const faqs = faqsByClass[cl.class_id] || [];

  const subCounts = {};
  for (const m of all) if (m.sub_class && m.sub_class !== "Other") subCounts[m.sub_class] = (subCounts[m.sub_class] || 0) + 1;
  const subs = Object.entries(subCounts).sort((a, b) => b[1] - a[1]);

  const formCounts = {};
  for (const m of all) if (m.dosage_form) formCounts[m.dosage_form] = (formCounts[m.dosage_form] || 0) + 1;
  const forms = Object.entries(formCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const related = classes.filter(x => x.class_id !== cl.class_id)
    .sort((a, b) => countOf(b) - countOf(a)).slice(0, 4);

  // Every medicine in the class ships in the HTML. Sub-class counts are
  // class-wide, so paginating would mean a chip promising 26 results showing
  // none; and the full list being crawlable is the point of the page. The
  // browser reveals CFG.perPage at a time and only prices what is on screen.
  const noindex = bool(c.noindex);
  const dir = cl.slug;
  const canonical = `${CFG.origin}${CFG.base}/${dir}/`;
  const suffix = "";
  const head = noindex ? '<meta name="robots" content="noindex,follow">' : "";
  const slice = all;
  const outs = [];

  {
    const body = `
${header()}
<main class="page" data-class-page>
  <div class="cart-banner" data-cart-banner hidden></div>
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol><li><a href="${CFG.origin}/">Home</a></li><li aria-hidden="true">›</li>
      <li><a href="${CFG.origin}${CFG.base}/">Medicines by Class</a></li><li aria-hidden="true">›</li>
      <li><span aria-current="page">${esc(cl.class_name)}</span></li></ol>
    </nav>

    <div class="chero">
      <div class="chero-art" aria-hidden="true"><span class="ca-1"></span><span class="ca-2"></span></div>
      <div class="chero-in">
        <span class="chero-ico">${icon(cl.icon, 26, 1.9)}</span>
        <div class="chero-main">
          <div class="eyebrow-sm" style="color:${cat(cl.category)[1]}">${esc(cl.category || "Medicine class")}</div>
          <h1>${esc(cl.h1_override || cl.class_name)}</h1>
          <p class="chero-sub">${md(c.intro_md, { inline: true })}</p>
          <div class="chero-meta">
            <span>${total} medicines in this class</span>
            <span class="dot"></span>
            <span>Information for general awareness</span>
            ${bool(cl.rx_required) ? '<span class="dot"></span><span class="pill-muted">Prescription required</span>' : ""}
          </div>
          <div class="chero-cred">
            <span class="cred-by"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6l7 2.8v5c0 4.2-2.9 7.4-7 8.8-4.1-1.4-7-4.6-7-8.8v-5z"/><polyline points="8.8 12.2 11.2 14.6 15.4 10.2"/></svg>${c.reviewer_name ? "Reviewed by " + esc(c.reviewer_name) + (c.reviewer_credentials ? ", " + esc(c.reviewer_credentials) : "") : esc(CFG.reviewer)}</span>
            <span class="cred-sep"></span>
            <span class="cred-date">Last updated: ${esc(c.content_last_updated)}</span>
            <span class="cred-sep"></span>
            <a href="${CFG.origin}/editorial-policy">Editorial policy</a>
          </div>
          <div class="chero-chips">
            <span>${tick(15, 2.2)}100% genuine medicines</span>
            <span class="chip-2l"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="7.5" width="13" height="9" rx="2"/><path d="M15.5 10.5h3.2l2.8 3v3h-6z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17.4" cy="18.5" r="1.6"/></svg><b>Same day delivery<i>on select cities</i></b></span>
            <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.4l7 2.8v5c0 4.2-2.9 7.4-7 8.8-4.1-1.4-7-4.6-7-8.8v-5z"/><path d="M9.3 12h5.4"/><path d="M12 9.3v5.4"/></svg>NPPA Regulated</span>
          </div>
        </div>
      </div>
    </div>

    <div class="class-grid">
      <aside class="side">
        <div class="side-top"><b>Filters</b><button type="button" class="side-clear" data-clear-filters>Clear all</button></div>
        ${subs.length ? `<hr><div class="side-h">Sub-class</div>
        <div class="side-opts">${subs.map(([s, n]) => `<label><input type="checkbox" data-sub-filter value="${esc(s)}">${esc(s)} <span class="n">(${n})</span></label>`).join("")}</div>` : ""}
        <hr><div class="side-h">Dosage form</div>
        <div class="side-forms">${forms.map(([f, n]) => `<button type="button" class="form-pill" data-form="${esc(f)}" aria-pressed="false">${esc(f)} (${n})</button>`).join("")}</div>
        <hr><div class="side-h">Availability</div>
        <div class="side-opts">
          <label><input type="checkbox" data-avail-filter="stock">In stock only</label>
          <label><input type="checkbox" data-avail-filter="subst">Substitute available</label>
        </div>
        <hr>
        <div class="side-rel"><b>Related classes</b><div>
          ${related.map(r => `<a href="${CFG.origin}${CFG.base}/${r.slug}/">${esc(r.class_name)}</a>`).join("")}
        </div></div>
      </aside>

      <div>
        <div class="toolbar">
          <div>
            <h2>Medicines in this class</h2>
            <span class="sub" data-med-count>${total} medicines · prices include applicable discounts</span>
          </div>
          <label class="sortwrap">Sort by
            <select id="sort" aria-label="Sort medicines">
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="discount">Discount</option>
            </select>
          </label>
          <div class="mtools">
            <button type="button" class="mtool" data-sort-btn><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>Sort</button>
            <button type="button" class="mtool" data-filter-btn><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="6" x2="19" y2="6"/><circle cx="15" cy="6" r="2.2"/><line x1="5" y1="13" x2="19" y2="13"/><circle cx="9" cy="13" r="2.2"/><line x1="5" y1="20" x2="19" y2="20"/><circle cx="16" cy="20" r="2.2"/></svg>Filter</button>
          </div>
        </div>

        <div class="med-grid" data-total="${total}" data-page-size="${CFG.perPage}">
          ${slice.map(medCard).join("\n          ")}
        </div>

        ${CFG.extraOffPct > 0 ? `<p class="grid-note">% OFF is calculated on the printed MRP. Discounts, delivery promise and PLUS savings are subject to <a href="${esc(CFG.tncUrl)}" rel="nofollow">T&amp;C</a>.</p>` : ""}

        ${total > CFG.perPage ? `<div class="pager">
          <button type="button" class="btn-ghost" data-show-more>Show next ${CFG.perPage} medicines</button>
          <span class="note-txt" data-shown-note>Showing ${CFG.perPage} of ${total}</span>
        </div>` : ""}
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <h2>${esc(c.about_heading || `About ${cl.class_name}`)}</h2>
        ${md(c.about_md)}
        ${c.subclass_md ? `<h3>${esc(c.subclass_heading)}</h3>${md(c.subclass_md)}` : ""}
        <h3>${esc(c.prescription_heading || "Prescription and dosage")}</h3>
        ${md(c.prescription_md)}
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card"><h2>Safety information</h2>
          <ul class="checks">${lines(c.safety_bullets_md).map(b => `<li>${tick()}<span>${md(b, { inline: true })}</span></li>`).join("")}</ul>
        </div>
        <div class="faq-card">
          <div style="padding:24px 28px 8px"><h2 style="font-size:22px;font-weight:700;margin:0">Frequently Asked Questions</h2></div>
          ${faqBlock(faqs, "c")}
        </div>
        <div class="card"><h2>Related classes</h2>
          <div class="rel-list">${related.map(r => `<a href="${CFG.origin}${CFG.base}/${r.slug}/"><span>${esc(r.class_name)}</span><span class="n">${countOf(r)} ${chev(12, 2.4)}</span></a>`).join("")}</div>
        </div>
      </div>
    </div>

    ${trust()}
  </div>
</main>

<div class="scrim"></div>
<aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Your cart" hidden>
  <div class="cd-hd"><b>Your cart <span data-cd-count>0</span></b>
    <button type="button" class="sheet-x" data-cd-close aria-label="Close">✕</button></div>
  <div class="cd-body" data-cd-list></div>
  <div class="cd-foot">
    <div class="cd-total"><span>Total</span><b data-cd-total>₹0</b></div>
    <button type="button" class="btn-primary" data-cd-go>Proceed to cart</button>
    <p class="cd-note">Up to 20 medicines per order. Prices include applicable discounts.</p>
  </div>
</aside>
<div class="sheet" id="sheet-sort" role="dialog" aria-modal="true" aria-label="Sort medicines">
  <div class="sheet-hd"><b>Sort by</b><button type="button" class="sheet-x" data-sheet-close aria-label="Close">✕</button></div>
  <div class="sheet-body">
    ${[["relevance", "Relevance"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["discount", "Discount"]]
      .map(([v, l], i) => `<button type="button" class="sheet-opt" role="radio" data-sort-value="${v}" aria-checked="${i === 0}">${l}<span class="tick">${tick(18, 2.6)}</span></button>`).join("")}
  </div>
</div>
<div class="sheet" id="sheet-filter" role="dialog" aria-modal="true" aria-label="Filter medicines">
  <div class="sheet-hd"><b>Filters</b><button type="button" class="sheet-x" data-sheet-close aria-label="Close">✕</button></div>
  <div class="sheet-body">
    <div class="side">
      ${subs.length ? `<div class="side-h">Sub-class</div>
      <div class="side-opts">${subs.map(([s, n]) => `<label><input type="checkbox" data-sub-filter value="${esc(s)}">${esc(s)} <span class="n">(${n})</span></label>`).join("")}</div><hr>` : ""}
      <div class="side-h">Dosage form</div>
      <div class="side-forms">${forms.map(([f, n]) => `<button type="button" class="form-pill" data-form="${esc(f)}" aria-pressed="false">${esc(f)} (${n})</button>`).join("")}</div>
      <hr><div class="side-h">Availability</div>
      <div class="side-opts">
        <label><input type="checkbox" data-avail-filter="stock">In stock only</label>
        <label><input type="checkbox" data-avail-filter="subst">Substitute available</label>
      </div>
    </div>
    <button type="button" class="btn-primary" data-sheet-close style="width:100%;margin-top:20px">Show ${total} medicines</button>
  </div>
</div>
${footer()}`;

    // conditions the class is browsed for become MedicalCondition entities,
    // which is what ties "fever" style queries to this page semantically
    const conditions = (cl.conditions || "").split("|").map(s => s.trim())
      .filter(Boolean).slice(0, 12)
      .map(t => ({ "@type": "MedicalCondition", name: t.replace(/\b\w/g, ch => ch.toUpperCase()) }));

    const jsonld = [graph([
      orgNode(),
      siteNode(),
      medicalPageNode({
        url: canonical, name: cl.class_name, desc: c.meta_description,
        reviewer: c.reviewer_name || CFG.reviewer, credentials: c.reviewer_credentials,
        reviewed: c.medically_reviewed_on, updated: c.content_last_updated,
        about: [
          { "@type": "DrugClass", name: cl.class_name, "@id": canonical + "#drugclass" },
          ...conditions,
        ],
      }),
      { "@type": "DrugClass", "@id": canonical + "#drugclass",
        name: cl.class_name, description: c.intro_md || "",
        ...(subs.length ? { subjectOf: subs.map(([s]) => ({ "@type": "MedicalEntity", name: s })) } : {}) },
      { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumb", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: CFG.origin + "/" },
        { "@type": "ListItem", position: 2, name: "Medicines by Class", item: CFG.origin + CFG.base + "/" },
        { "@type": "ListItem", position: 3, name: cl.class_name, item: canonical }] },
      { "@type": "ItemList", "@id": canonical + "#medicines",
        name: `Medicines in ${cl.class_name}`, numberOfItems: slice.length,
        itemListElement: slice.map((m, i) => ({ "@type": "ListItem",
          position: i + 1, name: m.medicine_name,
          url: CFG.origin + CFG.pdpBase + "/" + m.slug })) },
      ...(faqs.length ? [{ "@type": "FAQPage", "@id": canonical + "#faq",
        mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer_md } })) }] : []),
    ])];

    outs.push({ dir, canonical, indexable: !noindex });
    write(`${dir}/index.html`, page({
      title: (c.meta_title || `${cl.class_name} | PharmEasy`) + suffix,
      desc: c.meta_description || "", canonical, jsonld, body, extraHead: head,
    }));
  }
  return outs;
}

/* ================================================================ write == */
const manifest = {};
function write(rel, html) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, "utf8");
  manifest[rel] = crypto.createHash("sha1").update(html).digest("hex").slice(0, 12);
}

/* ================================================================= main == */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const urls = [{ loc: buildDirectory(), pri: "1.0" }];
let pageCount = 1;
for (const cl of classes) {
  for (const o of buildClass(cl)) {
    pageCount++;
    if (o.indexable) urls.push({ loc: o.canonical, pri: cl.sitemap_priority || "0.8" });
  }
}

const today = (process.env.BUILD_DATE || new Date().toISOString()).slice(0, 10);
fs.writeFileSync(path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

fs.cpSync(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
fs.writeFileSync(path.join(DIST, "manifest.json"), JSON.stringify(manifest, null, 1));

console.log(`classes            : ${classes.length}`);
console.log(`medicines          : ${meds.length.toLocaleString()}`);
console.log(`pages written      : ${pageCount}  (${urls.length} indexable, in sitemap)`);
console.log(`output             : dist/`);
