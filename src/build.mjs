/* =========================================================================
   Medicines by Class – static site builder
   Reads the five sheet CSVs, writes crawlable HTML into dist/.
       node src/build.mjs
   =========================================================================*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
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

const SOCIAL_URL = {
  Instagram: "https://www.instagram.com/pharmeasyapp/",
  Facebook:  "https://www.facebook.com/pharmeasy/",
  YouTube:   "https://www.youtube.com/channel/UCDats_DLX-bGZH3-KGu8JhA",
  Twitter:   "https://www.twitter.com/pharmeasyapp/",
};
const SOCIAL = {
  Instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none"/>',
  Facebook: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>',
  YouTube: '<path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 9 2 12 2 12s0 3 .4 4.8a2.6 2.6 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8C22 15 22 12 22 12s0-3-.4-4.8zM10 15.2V8.8L15.5 12z"/>',
  Twitter: '<path d="M22 5.9c-.7.3-1.5.6-2.3.7a3.7 3.7 0 0 0 1.6-2 7.4 7.4 0 0 1-2.3.9 3.6 3.6 0 0 0-6.2 3.3A10.3 10.3 0 0 1 3.3 5a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.2-.2-1.7-.5a3.6 3.6 0 0 0 2.9 3.6c-.6.2-1.2.2-1.8.1a3.6 3.6 0 0 0 3.4 2.5A7.3 7.3 0 0 1 2 17.1a10.3 10.3 0 0 0 15.9-9.2c.8-.6 1.5-1.3 2.1-2z"/>',
};

const CART_ICON = (s = 21) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3h2.2l2.6 11.2h10.4"/><path d="M6.4 6.6H21l-1.9 6.6H7.9"/><circle cx="9" cy="19.2" r="1.5"/><circle cx="17.4" cy="19.2" r="1.5"/></svg>`;

// design v2: one 76px white row – logo (with tagline), nav inline, cart right.
/* The real PharmEasy mobile wordmark, inlined so it renders without a
   network round-trip and can't be knocked out by an asset failure. */
const PE_CART = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.4082 2.9739C3.0216 2.9739 2.7082 3.2873 2.7082 3.6739C2.7082 4.0605 3.0216 4.3739 3.4082 4.3739V2.9739ZM5.17586 3.6739V4.37393L5.18193 4.37388L5.17586 3.6739ZM6.18789 4.0462L5.72919 4.57496L6.18789 4.0462ZM6.69914 4.9939L7.38087 4.83502C7.37814 4.82333 7.37512 4.8117 7.37179 4.80016L6.69914 4.9939ZM9.07095 15.1708L8.38922 15.3297C8.46307 15.6466 8.74556 15.8708 9.07095 15.8708V15.1708ZM18.1906 15.1708V15.8708C18.1989 15.8708 18.2072 15.8706 18.2154 15.8703L18.1906 15.1708ZM19.1927 14.3608L19.8718 14.5308C19.874 14.5221 19.876 14.5133 19.8778 14.5045L19.1927 14.3608ZM20.5295 7.98836L19.8466 7.8345L19.8445 7.84464L20.5295 7.98836ZM19.5274 6.70836L19.5436 6.00855C19.5382 6.00842 19.5328 6.00836 19.5274 6.00836V6.70836ZM7.20995 6.00836C6.82335 6.00836 6.50995 6.32176 6.50995 6.70836C6.50995 7.09496 6.82335 7.40836 7.20995 7.40836V6.00836ZM3.4082 4.3739H5.17586V2.9739H3.4082V4.3739ZM5.18193 4.37388C5.39613 4.37202 5.54964 4.41921 5.72919 4.57496L6.64659 3.51743C6.18993 3.12128 5.69871 2.96934 5.16979 2.97393L5.18193 4.37388ZM5.72919 4.57496C5.72916 4.57493 5.72976 4.57545 5.73096 4.57661C5.73216 4.57777 5.73387 4.57949 5.73608 4.58183C5.74055 4.58659 5.74652 4.59337 5.75382 4.60252C5.76872 4.62121 5.78641 4.64627 5.80613 4.67822C5.84626 4.74322 5.88535 4.82128 5.92077 4.90268C5.95564 4.98282 5.98316 5.05742 6.00186 5.11188C6.0111 5.13878 6.01789 5.15993 6.02209 5.17335C6.02418 5.18004 6.02561 5.18476 6.02635 5.18723C6.02672 5.18847 6.02692 5.18915 6.02694 5.18923C6.02695 5.18927 6.02692 5.18916 6.02685 5.18889C6.02681 5.18876 6.02676 5.18859 6.0267 5.18839C6.02667 5.18828 6.02663 5.18817 6.0266 5.18804C6.02658 5.18798 6.02655 5.18788 6.02654 5.18785C6.02651 5.18775 6.02648 5.18764 6.69914 4.9939C7.37179 4.80016 7.37176 4.80005 7.37173 4.79994C7.37172 4.7999 7.37168 4.79978 7.37166 4.7997C7.37161 4.79954 7.37156 4.79936 7.37151 4.79918C7.3714 4.7988 7.37128 4.79839 7.37115 4.79794C7.37088 4.79702 7.37057 4.79595 7.3702 4.79471C7.36948 4.79223 7.36855 4.78909 7.36742 4.78534C7.36518 4.77784 7.36213 4.76784 7.35831 4.75562C7.35068 4.73121 7.33987 4.69769 7.32599 4.65727C7.29847 4.57709 7.25774 4.46643 7.2045 4.34409C7.11077 4.12867 6.93203 3.76504 6.64659 3.51743L5.72919 4.57496ZM6.01741 5.15279L8.38922 15.3297L9.75268 15.0119L7.38087 4.83502L6.01741 5.15279ZM9.07095 15.8708H18.1906V14.4708H9.07095V15.8708ZM18.2154 15.8703C18.5993 15.8567 18.9685 15.7188 19.2673 15.4773L18.3873 14.3885C18.3246 14.4392 18.2468 14.4683 18.1657 14.4712L18.2154 15.8703ZM19.2673 15.4773C19.5662 15.2358 19.7784 14.9036 19.8718 14.5308L18.5137 14.1908C18.4943 14.2684 18.45 14.3378 18.3873 14.3885L19.2673 15.4773ZM19.8778 14.5045L21.2146 8.13208L19.8445 7.84464L18.5076 14.2171L19.8778 14.5045ZM21.2124 8.1422C21.2694 7.88931 21.2694 7.62695 21.2125 7.37407L19.8467 7.68165C19.858 7.73199 19.858 7.78419 19.8467 7.83452L21.2124 8.1422ZM21.2125 7.37407C21.1555 7.12119 21.043 6.88418 20.8833 6.68012L19.7809 7.54318C19.8129 7.58402 19.8353 7.63132 19.8467 7.68165L21.2125 7.37407ZM20.8833 6.68012C20.7235 6.47607 20.5205 6.31005 20.2888 6.19395L19.6615 7.44557C19.7082 7.46896 19.749 7.50232 19.7809 7.54318L20.8833 6.68012ZM20.2888 6.19395C20.0571 6.07786 19.8026 6.01456 19.5436 6.00855L19.5111 7.40817C19.5635 7.40939 19.6149 7.42219 19.6615 7.44557L20.2888 6.19395ZM19.5274 6.00836H7.20995V7.40836H19.5274V6.00836Z" fill="#30363C"/><path d="M10.7781 20.5007C11.601 20.5007 12.2681 19.8369 12.2681 19.0179C12.2681 18.199 11.601 17.5352 10.7781 17.5352C9.95518 17.5352 9.28809 18.199 9.28809 19.0179C9.28809 19.8369 9.95518 20.5007 10.7781 20.5007Z" stroke="#30363C" stroke-width="1.4" fill="none"/><path d="M17.3982 20.5007C18.2211 20.5007 18.8882 19.8369 18.8882 19.0179C18.8882 18.199 18.2211 17.5352 17.3982 17.5352C16.5753 17.5352 15.9082 18.199 15.9082 19.0179C15.9082 19.8369 16.5753 20.5007 17.3982 20.5007Z" stroke="#30363C" stroke-width="1.4" fill="none"/></svg>`;

const PE_WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106 20" width="106" height="29" role="img" aria-label="PharmEasy"><path fill-rule="evenodd" clip-rule="evenodd" d="M28.7773 11.115H30.3824C31.6507 11.115 32.391 10.4755 32.391 9.29928C32.391 8.10821 31.6655 7.46875 30.3898 7.46875H28.7773V11.115ZM30.9715 5.66602C33.1488 5.66602 34.6372 7.11134 34.6372 9.29057C34.6372 11.4478 33.0902 12.8934 30.8616 12.8934H28.7727V16.1471H26.5586V5.66602H30.9715Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M35.9316 5.07617H38.0282V9.44866H38.1603C38.5339 8.53326 39.4137 7.98164 40.6011 7.98164C42.3385 7.98164 43.3721 9.06372 43.3721 10.9887V16.1456H41.2389V11.4898C41.2389 10.3786 40.7184 9.80477 39.7508 9.80477C38.6802 9.80477 38.0646 10.5093 38.0646 11.548V16.1456H35.9316V5.07617Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M49.7954 13.2466V12.6582L48.1605 12.7601C47.2442 12.8254 46.7969 13.1521 46.7969 13.726C46.7969 14.3215 47.3176 14.685 48.058 14.685C49.0477 14.685 49.7954 14.0601 49.7954 13.2466ZM44.709 13.8631C44.709 12.4106 45.8303 11.5677 47.8391 11.4516L49.7964 11.3352V10.6817C49.7964 10.0131 49.3124 9.63558 48.4325 9.63558C47.6629 9.63558 47.1498 9.89697 46.9741 10.3764H45.0094C45.1484 8.89479 46.5194 7.96484 48.5498 7.96484C50.6908 7.96484 51.9001 8.96729 51.9001 10.6817V16.1508H49.8331V15.105H49.701C49.2833 15.8389 48.4035 16.2746 47.3551 16.2746C45.801 16.2746 44.709 15.3301 44.709 13.8631Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M53.7012 8.13487H55.7684V9.41325H55.8999C56.1129 8.614 56.9486 8.00391 57.9748 8.00391C58.2681 8.00391 58.6274 8.04042 58.8105 8.10603V10.0305C58.6417 9.9654 58.1434 9.89979 57.7991 9.89979C56.6337 9.89979 55.8342 10.5826 55.8342 11.7086V16.1462H53.7012V8.13487Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M60.041 8.13555H62.108V9.44277H62.2398C62.5698 8.52764 63.4129 7.96094 64.4758 7.96094C65.6119 7.96094 66.389 8.51309 66.7116 9.44277H66.8437C67.2173 8.54933 68.1484 7.96094 69.2771 7.96094C70.8901 7.96094 71.8941 8.99962 71.8941 10.6487V16.1469H69.7611V11.208C69.7611 10.2563 69.3141 9.78406 68.4126 9.78406C67.5473 9.78406 66.9903 10.3942 66.9903 11.2445V16.1469H64.9374V11.1209C64.9374 10.2709 64.4391 9.78406 63.6031 9.78406C62.7677 9.78406 62.174 10.4309 62.174 11.3241V16.1469H60.041V8.13555Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M80.883 16.1468H73.875V5.66602H80.883V7.53967H76.0888V9.98771H80.6119V11.7233H76.0888V14.2729H80.883V16.1468Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M87.061 13.2466V12.6582L85.4261 12.7601C84.5101 12.8254 84.0625 13.1521 84.0625 13.726C84.0625 14.3215 84.5833 14.685 85.3236 14.685C86.3133 14.685 87.061 14.0601 87.061 13.2466ZM81.9746 13.8631C81.9746 12.4106 83.0959 11.5677 85.1047 11.4516L87.062 11.3352V10.6817C87.062 10.0131 86.5782 9.63558 85.6984 9.63558C84.9288 9.63558 84.4154 9.89697 84.2397 10.3764H82.275C82.414 8.89479 83.785 7.96484 85.8155 7.96484C87.9564 7.96484 89.1659 8.96729 89.1659 10.6817V16.1508H87.0987V15.105H86.9666C86.5489 15.8389 85.6691 16.2746 84.621 16.2746C83.0669 16.2746 81.9746 15.3301 81.9746 13.8631Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M93.8439 7.96094C95.8968 7.96094 97.1064 8.81072 97.2234 10.3436H95.2514C95.1414 9.82798 94.6505 9.50812 93.8587 9.50812C93.0962 9.50812 92.5318 9.84994 92.5318 10.3582C92.5318 10.7503 92.8763 10.99 93.6241 11.1572L95.1414 11.4836C96.7103 11.8255 97.4142 12.4792 97.4142 13.6774C97.4142 15.2751 95.97 16.3218 93.8513 16.3218C91.7183 16.3218 90.4279 15.4572 90.2812 13.9174H92.3632C92.5244 14.4621 93.0452 14.7743 93.8951 14.7743C94.7237 14.7743 95.2955 14.4328 95.2955 13.9174C95.2955 13.525 94.9874 13.2853 94.2764 13.1329L92.8106 12.8057C91.2417 12.4644 90.4791 11.7236 90.4791 10.4889C90.4791 8.97052 91.8282 7.96094 93.8439 7.96094Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M98.536 19.0351V17.3355C98.6092 17.3503 98.9318 17.3503 99.0196 17.3503C99.8185 17.3503 100.273 17.0958 100.449 16.4857L100.523 16.1955L97.6855 8.13281H100.039L101.739 14.2049H101.871L103.572 8.13281H105.83L103.044 16.268C102.355 18.3308 101.365 19.057 99.3496 19.057C99.2687 19.057 98.624 19.0499 98.536 19.0351Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10.0053 10.2162C9.51276 9.74317 8.80045 9.75058 8.31535 10.2088C7.30764 11.1549 6.32266 12.1232 5.33741 13.0844C5.04968 13.3696 4.93581 13.7302 5.0267 14.1278C5.23146 15.1115 6.40589 15.4721 7.17131 14.7813C7.78508 14.218 8.36846 13.64 8.9595 13.0545C9.14154 12.8743 9.25516 12.8365 9.45966 13.0394C10.3614 13.9402 11.2859 14.8263 12.218 15.6972C12.4225 15.8925 12.3998 16.0052 12.1953 16.1854C11.5966 16.7484 10.9979 17.3264 10.4069 17.9048C10.0206 18.2876 9.94475 18.7606 10.1493 19.2488C10.3538 19.7443 10.7704 19.9771 11.2027 19.9996C11.6421 20.007 11.9451 19.9094 12.1726 19.6766C13.1726 18.7231 14.1729 17.777 15.1505 16.801C15.6203 16.328 15.6203 15.6448 15.1429 15.1792C13.4379 13.505 11.7329 11.8605 10.0053 10.2162Z" fill="#10847E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M18.5827 11.7247C18.257 11.4096 17.9386 11.0715 17.5901 10.7712C17.3552 10.5685 17.3021 10.4259 17.5069 10.1331C18.2266 9.08934 18.56 7.90303 18.5751 6.63417C18.5751 6.09366 18.4995 5.56797 18.3856 5.04994C17.105 0.117107 10.8233 -1.67745 7.04194 1.82144C5.87491 2.90246 4.74593 4.02131 3.60189 5.12508C2.53342 6.16112 1.45754 7.18976 0.396465 8.2258C0.0252464 8.5864 -0.0960272 9.02188 0.0783531 9.51715C0.252469 10.0127 0.63135 10.268 1.14683 10.3357C1.59388 10.3881 1.96509 10.2005 2.27581 9.88542C4.37471 7.85805 6.48128 5.83094 8.57278 3.80357C9.62594 2.77494 10.8688 2.36195 12.3312 2.51222C14.5892 2.75986 16.3018 4.91475 15.9911 7.11462C15.8471 8.09828 15.423 8.91684 14.703 9.60736C14.1648 10.1331 14.1043 10.8312 14.5892 11.3268C15.3242 12.0927 16.0973 12.8359 16.8854 13.5491C17.3853 14 18.1735 13.9322 18.6358 13.4515C19.1056 12.9486 19.0903 12.2427 18.5827 11.7247Z" fill="#10847E"/></svg>`;

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
        <span class="cart-ico">${PE_CART}<span class="cart-count" data-cart-count>0</span></span>Cart
        <span class="sync-note" data-sync-note hidden></span>
      </a>
    </div>
  </div>

  <div class="mhdr">
    <div class="mhdr-row">
      <button type="button" class="mhdr-btn mhdr-burger" aria-label="Open menu" aria-expanded="false" aria-controls="m-menu" data-menu-btn>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.1 5.99999H20M14.1 12H20M4 18H20M5.15 5.99999H8.73C9.36513 5.99999 9.88 6.51486 9.88 7.14999V10.79C9.88 11.4251 9.36513 11.94 8.73 11.94H5.15C4.51487 11.94 4 11.4251 4 10.79V7.14999C4 6.51486 4.51487 5.99999 5.15 5.99999Z" stroke="#30363C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <a class="mhdr-logo" href="${CFG.origin}/" aria-label="PharmEasy home">${PE_WORDMARK}</a>
      <a class="mhdr-btn mhdr-cart" href="${CFG.cartUrl}" aria-label="Cart" data-cart-link>
        ${PE_CART}
        <span class="cart-count" data-cart-count>0</span>
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
        <div class="ft-title"><button type="button" class="ft-toggle" aria-expanded="false" aria-controls="${id}">${esc(title)}<span class="ft-chev">${chevDown(18, 2)}</span></button></div>
        <ul class="ft-list" id="${id}" data-ft-list>${links.map(l => `<li><a href="${CFG.origin}/">${esc(l)}</a></li>`).join("")}</ul>
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
          `<a href="${SOCIAL_URL[n] || "#"}" aria-label="${n}" target="_blank" rel="noopener noreferrer"><svg width="26" height="26" viewBox="0 0 24 24" fill="${n === "Instagram" ? "none" : "currentColor"}" stroke="${n === "Instagram" ? "currentColor" : "none"}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${p}</svg></a>`).join("")}
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

const page = ({ title, desc, canonical, jsonld, body, extraHead = "", ogSlug = "index" }) => `<!DOCTYPE html>
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
<meta property="og:image" content="${CFG.origin}${CFG.base}/og/${ogSlug}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${CFG.origin}${CFG.base}/og/${ogSlug}.png">
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
                   : avail === "out" ? "Out of stock"
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
      <ol><li><a href="${CFG.origin}/">Home</a></li><li aria-hidden="true" class="crumb-sep"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></li>
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
        ${popular.map((p) => { const [tint, accent] = cat(p.category); return `<a class="pop-row" href="${CFG.origin}${CFG.base}/${p.slug}/">
          <span class="cls-tile" style="background:${tint};color:${accent}">${icon(p.icon, 20, 1.9)}</span>
          <span class="pop-main"><span class="pop-name">${esc(p.class_name)}</span><span class="pop-n">${countOf(p)} medicines</span></span>
          <span class="cls-go">${chev(16, 2.4)}</span>
        </a>`; }).join("\n        ")}
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

  write("index.html", page({ title: c.meta_title, desc: c.meta_description, canonical, jsonld, body, ogSlug: "index" }));
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
      <ol><li><a href="${CFG.origin}/">Home</a></li><li aria-hidden="true" class="crumb-sep"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></li>
      <li><a href="${CFG.origin}${CFG.base}/">Medicines by Class</a></li><li aria-hidden="true" class="crumb-sep"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></li>
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
        <div class="list-head">
          <h2 class="list-title">Medicines in this class</h2>
          <label class="sortwrap"><span>Sort By:</span>
            <select id="sort" aria-label="Sort medicines">
              <option value="relevance">Popularity</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="discount">Discount</option>
            </select>
          </label>
        </div>
        <div class="toolbar">
          <span class="sub" data-med-count>${total} medicines · prices include applicable discounts</span>
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
        <h2 class="faq-title">Frequently Asked Questions</h2>
        <div class="faq-card">${faqBlock(faqs, "c")}</div>
        <div class="card"><h2>Related classes</h2>
          <div class="rel-list">${related.map(r => `<a href="${CFG.origin}${CFG.base}/${r.slug}/"><span>${esc(r.class_name)}</span><span class="n">${countOf(r)} ${chev(12, 2.4)}</span></a>`).join("")}</div>
        </div>
      </div>
    </div>

    ${trust()}
  </div>
</main>

<div class="scrim"></div>
<div class="qty-sheet" id="qty-sheet" role="dialog" aria-modal="true" aria-label="Select quantity" hidden>
  <div class="qs-hd">Select Quantity</div>
  <div class="qs-list" data-qs-list></div>
</div>
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
      desc: c.meta_description || "", canonical, jsonld, body, extraHead: head, ogSlug: cl.slug,
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

/* Share cards. Run from here rather than as a separate npm script so both the
   production and the Pages build get them — dist/ is wiped on every build, and
   a missing og/ means WhatsApp shows a bare grey link. */
let ogCount = 0;
try {
  const r = spawnSync("python3", [path.join(ROOT, "src", "prep", "make_og.py")], { encoding: "utf-8" });
  if (r.status === 0) ogCount = (fs.existsSync(path.join(DIST, "og")) ? fs.readdirSync(path.join(DIST, "og")).length : 0);
  else console.warn(`  ! og cards skipped: ${(r.stderr || "").trim().split("\n").pop() || "python3/Pillow unavailable"}`);
} catch {
  console.warn("  ! og cards skipped: python3 not found");
}

console.log(`classes            : ${classes.length}`);
console.log(`medicines          : ${meds.length.toLocaleString()}`);
console.log(`pages written      : ${pageCount}  (${urls.length} indexable, in sitemap)`);
console.log(`og share cards     : ${ogCount}`);
console.log(`output             : dist/`);
