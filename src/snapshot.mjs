/* =========================================================================
   Build-time price snapshot.

   The pages ship with a last-known price baked in so that (a) crawlers see
   real numbers rather than empty price blocks, (b) there is no layout shift
   when the live call lands, and (c) an API outage degrades to yesterday's
   price instead of a blank grid. The browser always re-fetches and overwrites.

       node src/snapshot.mjs [--limit N] [--concurrency N]
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.PRICE_API || "https://api.pharmeasy.in/v5/product-details/{id}/dynamic";

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
  return rows.filter(r => r.some(v => v !== ""))
    .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const skus = parseCSV(fs.readFileSync(path.join(ROOT, "sheets", "02_medicines.csv"), "utf8"))
  .filter(r => r.sku && r.status === "live")
  .map(r => r.sku)
  .slice(0, LIMIT);

const items = {};
let done = 0, ok = 0, failed = 0;
const started = Date.now();

async function one(sku) {
  const url = API.replace("{id}", encodeURIComponent(sku));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctl = AbortSignal.timeout(15000);
      const r = await fetch(url, { headers: { accept: "application/json", origin: "https://pharmeasy.in" }, signal: ctl });
      if (r.status === 404) return null;                 // gone, not an error
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      const sale = parseFloat(d.salePrice), mrp = parseFloat(d.costPrice);
      const pct = parseFloat(d.discountPercent);
      const v = (d.variants && d.variants[0]) || {};
      // productTierAttributes carries the exact commercial state:
      //   type 5 = live  |  type 2 = out of stock / discontinued  |  type 1 = not sold
      const tier = d.productTierAttributes || {};
      return {
        sale: isFinite(sale) && sale > 0 ? sale : null,
        mrp: isFinite(mrp) && mrp > 0 ? mrp : null,
        pct: isFinite(pct) ? pct : null,
        avail: d.isAvailable === true,
        subst: !!(d.productSubstitutionAttributes && d.productSubstitutionAttributes.count > 0),
        // cart/addToCart needs productType alongside productId
        ptype: v.productType != null ? v.productType : 1,
        tierType: tier.type != null ? tier.type : null,
        tierText: tier.text || "",
        notify: !!((d.productAvailabilityFlags || {}).notifyMe),
      };
    } catch {
      if (attempt === 2) return undefined;               // undefined = failed
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

const queue = skus.slice();
async function worker() {
  for (;;) {
    const sku = queue.shift();
    if (!sku) return;
    const res = await one(sku);
    if (res === undefined) failed++; else if (res) { items[sku] = res; ok++; }
    if (++done % 100 === 0 || done === skus.length) {
      const rate = done / ((Date.now() - started) / 1000);
      process.stdout.write(`\r  ${done}/${skus.length}  ok ${ok}  failed ${failed}  ${rate.toFixed(0)}/s   `);
    }
  }
}

console.log(`snapshotting ${skus.length.toLocaleString()} skus with ${CONC} workers`);
await Promise.all(Array.from({ length: CONC }, worker));
process.stdout.write("\n");

const rate = failed / Math.max(1, skus.length);
if (rate > 0.2) {
  console.error(`\nABORT: ${(rate * 100).toFixed(1)}% of price lookups failed.`);
  console.error("Refusing to overwrite the snapshot with mostly-missing data.");
  process.exit(1);
}

fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "prices.json"),
  JSON.stringify({ takenAt: new Date().toISOString(), ok, failed, items }, null, 0));

const priced = Object.values(items).filter(i => i.sale).length;
const inStock = Object.values(items).filter(i => i.avail).length;
console.log(`\nwrote data/prices.json`);
console.log(`  priced   : ${priced.toLocaleString()} / ${skus.length.toLocaleString()}`);
console.log(`  in stock : ${inStock.toLocaleString()}`);
console.log(`  failed   : ${failed}`);
