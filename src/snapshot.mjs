/* =========================================================================
   Nightly price snapshot, from the site's own Next.js data endpoint.

   The /v5/product-details/{id}/dynamic API returns a discountPercent that
   does not by itself explain the price a customer is shown — there is more
   logic behind it than we can reproduce. So instead of computing anything,
   we read the numbers the PDP itself renders:

       /_next/data/{buildId}/online-medicine-order/{sku}.json

   buildId changes on every pharmeasy.in deploy, so it is read once from a
   live PDP's __NEXT_DATA__ at the start of a run and re-read if a request
   starts 404ing mid-run (which is what a deploy looks like from here).

   Results are written back into sheets/02_medicines.csv so the build reads
   prices from the same CSV as everything else, and no page fetches prices
   at render time.

       node src/snapshot.mjs [--limit N] [--concurrency N]
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = process.env.PE_ORIGIN || "https://pharmeasy.in";
const PDP = (slugOrId) => `${ORIGIN}/online-medicine-order/${slugOrId}`;
const DATA = (buildId, sku) => `${ORIGIN}/_next/data/${buildId}/online-medicine-order/${sku}.json`;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > -1 ? Number(process.argv[i + 1]) : d;
};
const LIMIT = arg("--limit", Infinity);
const CONC = arg("--concurrency", 8);

/* fields are quoted where they contain commas, so a naive split mis-indexes */
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return {
    head,
    rows: rows.filter(r => r.some(v => v !== ""))
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()]))),
  };
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCSV = (head, rows) =>
  head.join(",") + "\n" + rows.map(r => head.map(h => csvCell(r[h])).join(",")).join("\n") + "\n";

/* ---------------------------------------------------------------- fetch --- */
/* CloudFront answers a sustained crawl with occasional 403/429/5xx. Those are
   transient and worth backing off on; only a 404 is a real answer. */
async function getText(url, tries = 4) {
  let last = 0;
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" } });
      last = r.status;
      if (r.status === 404) return { status: 404, body: null };
      if (!r.ok) throw new Error("HTTP " + r.status);
      return { status: r.status, body: await r.text() };
    } catch (e) {
      if (i === tries) return { status: last, body: null, error: e.message };
      await new Promise(s => setTimeout(s, 500 * i * i));
    }
  }
}

/** Is this buildId the one currently deployed? Its static manifest only
 *  exists for the live build, which makes this a cheap, definitive probe. */
async function isLive(id) {
  try {
    const r = await fetch(`${ORIGIN}/_next/static/${id}/_buildManifest.js`, { headers: { "user-agent": UA } });
    return r.status === 200;
  } catch { return false; }
}

/** buildId rotates on every pharmeasy.in deploy, and CloudFront keeps serving
 *  HTML from older builds — a single PDP will happily hand back a dead id whose
 *  data endpoint 404s on everything. Different slugs are cached independently,
 *  so sample a spread of them, then keep whichever candidate is actually live. */
async function readBuildId(samples) {
  const seen = new Map();
  for (const slug of samples) {
    try {
      const { body } = await getText(PDP(slug), 1);
      if (!body) continue;
      const m = body.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) continue;
      const id = JSON.parse(m[1]).buildId;
      if (id) seen.set(id, (seen.get(id) || 0) + 1);
    } catch { /* try the next slug */ }
  }
  if (!seen.size) throw new Error("no buildId found on any sample PDP — page shape changed");

  // most-seen first: the live build is normally the one most edges are serving
  for (const [id] of [...seen].sort((a, b) => b[1] - a[1])) {
    if (await isLive(id)) return id;
  }
  throw new Error(`found ${seen.size} buildId(s) but none are live: ${[...seen.keys()].join(", ")}`);
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

function extract(json) {
  const pp = json?.pageProps || {};
  const pd = pp.productDetails;
  if (!pd) return null;
  // A single-pack product carries an empty variants[] and mirrors the selected
  // variant's numbers on productDetails itself; where both exist they agree.
  // Reading the top level first covers both shapes — going variants-first
  // silently dropped every single-pack product.
  const v = num(pd.salePrice) != null ? pd : pd.variants?.[0];
  if (!v) return null;
  const flags = v.productAvailabilityFlags || pd.productAvailabilityFlags || {};
  const tier = v.productTierAttributes || pd.productTierAttributes || null;
  return {
    mrp: num(v.costPrice),
    sale: num(v.salePrice),
    off: num(v.discountPercent),
    available: flags.isAvailable === true,
    tierType: tier ? Number(tier.type) : null,
    tierText: tier ? String(tier.text || "") : "",
    maxQty: num(v.maxQuantity),
    couponMrpThreshold: num(pp.bestOfferDetails?.couponMrpThreshold),
  };
}

/* ------------------------------------------------------------------ run --- */
const csvPath = path.join(ROOT, "sheets", "02_medicines.csv");
const { head, rows } = parseCSV(fs.readFileSync(csvPath, "utf8"));
const live = rows.filter(r => r.status === "live" && r.sku).slice(0, LIMIT);

if (!live.length) { console.error("no live medicines in 02_medicines.csv"); process.exit(1); }

const SAMPLES = Array.from({ length: 12 }, (_, i) => live[Math.floor(i * live.length / 12)])
  .filter(Boolean).map(r => r.slug || r.sku);
let buildId = await readBuildId(SAMPLES);
console.log(`buildId            : ${buildId}`);
console.log(`snapshotting ${live.length.toLocaleString()} skus with ${CONC} workers`);

const out = new Map();
let done = 0, ok = 0, missing = 0, rotated = false, couponThreshold = null;
const failStatus = new Map();
const started = Date.now();

async function one(row) {
  let res = await getText(DATA(buildId, row.sku), 2);

  // A sudden 404 usually means pharmeasy.in deployed and buildId rotated.
  // Re-read it once, then retry this sku; later skus use the fresh id.
  if (res.status === 404 && !rotated) {
    rotated = true;
    try {
      const fresh = await readBuildId(SAMPLES);
      if (fresh !== buildId) {
        console.log(`  buildId rotated mid-run -> ${fresh}`);
        buildId = fresh;
      }
    } catch (e) { console.warn("  buildId re-read failed:", e.message); }
    res = await getText(DATA(buildId, row.sku), 2);
  }

  if (res.body) {
    try {
      const d = extract(JSON.parse(res.body));
      if (d) {
        out.set(row.sku, d);
        if (couponThreshold == null && d.couponMrpThreshold != null) couponThreshold = d.couponMrpThreshold;
        ok++;
      } else missing++;
    } catch { missing++; }
  } else { missing++; failStatus.set(res.status, (failStatus.get(res.status) || 0) + 1); }

  if (++done % 100 === 0 || done === live.length) {
    const rate = done / ((Date.now() - started) / 1000);
    process.stdout.write(`  ${done}/${live.length}  ok:${ok}  missing:${missing}  ${rate.toFixed(1)}/s\r`);
  }
}

const queue = live.slice();
await Promise.all(Array.from({ length: CONC }, async function worker() {
  while (queue.length) await one(queue.shift());
}));
process.stdout.write("\n");

// A wholesale failure (endpoint moved, blocked, buildId scheme changed) must
// not quietly publish a site with no prices.
if (ok < live.length * 0.5) {
  console.error(`only ${ok}/${live.length} priced — refusing to write. Check the endpoint shape.`);
  process.exit(1);
}

/* ---- write the numbers back into the medicines CSV ---------------------- */
const COLS = ["live_mrp", "live_sale", "live_off_pct", "live_available",
              "live_tier_type", "live_tier_text", "live_max_qty"];
const newHead = head.slice();
for (const c of COLS) if (!newHead.includes(c)) newHead.push(c);

const stamp = new Date().toISOString().slice(0, 10);
for (const r of rows) {
  const d = out.get(r.sku);
  r.live_mrp        = d?.mrp ?? "";
  r.live_sale       = d?.sale ?? "";
  r.live_off_pct    = d?.off ?? "";
  r.live_available  = d ? String(d.available) : "";
  r.live_tier_type  = d?.tierType ?? "";
  r.live_tier_text  = d?.tierText ?? "";
  r.live_max_qty    = d?.maxQty ?? "";
}
fs.writeFileSync(csvPath, toCSV(newHead, rows));

/* The coupon threshold is one site-wide number, not a per-medicine one. */
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "offer.json"),
  JSON.stringify({ couponMrpThreshold: couponThreshold, buildId, updated: stamp }, null, 2));

const sellable = [...out.values()].filter(d => d.available && d.tierType !== 1).length;
console.log(`priced             : ${ok.toLocaleString()} / ${live.length.toLocaleString()}`);
console.log(`missing            : ${missing.toLocaleString()}${failStatus.size ? "  (" + [...failStatus].map(([c, n]) => `${c || "net"}x${n}`).join(", ") + ")" : ""}`);
console.log(`available & sold   : ${sellable.toLocaleString()}`);
console.log(`coupon threshold   : ₹${couponThreshold ?? "?"}`);
console.log(`written            : sheets/02_medicines.csv, data/offer.json`);
