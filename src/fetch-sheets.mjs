/* =========================================================================
   Pulls every tab out of the one Google Sheet into sheets/*.csv.

       SHEET_ID=1Hge... node src/fetch-sheets.mjs

   Tabs are fetched by NAME, not gid. gids change when a tab is deleted and
   recreated; names survive that, and they are what a human actually sees.

   The sheet must be shared "Anyone with the link -> Viewer". If it has to
   stay private, swap fetchTab() for a Sheets API call with a service account
   and set GOOGLE_SERVICE_ACCOUNT_JSON instead.
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "sheets");

const SHEET_ID = process.env.SHEET_ID || "1HgeXKTLWRIls3TfOjdnvUMJdW-0DE-8Pdr1hJ34pziA";

/* tab name in the Google Sheet -> local file the build reads */
const TABS = [
  ["classes",   "01_classes.csv"],
  ["medicines", "02_medicines.csv"],
  ["content",   "03_class_content.csv"],
  ["faqs",      "04_faqs.csv"],
  ["redirects", "05_redirects.csv"],
];

/* the gviz endpoint returns proper RFC4180 csv and accepts a tab name */
const url = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
  `?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

async function fetchTab(tab) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url(tab), { redirect: "follow", signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const text = await r.text();

      // a private sheet returns an HTML sign-in page with a 200
      if (/^\s*</.test(text) || /<!DOCTYPE|<html/i.test(text.slice(0, 400))) {
        throw new Error("got HTML, not CSV – the sheet is not link-readable");
      }
      if (text.length < 40) throw new Error(`only ${text.length} bytes back`);
      return text;
    } catch (e) {
      if (attempt === 2) throw new Error(`tab "${tab}": ${e.message}`);
      await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
    }
  }
}

function rowCount(csv) {
  // count records, not lines -- cells contain newlines
  let n = 0, q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (q && csv[i + 1] === '"') i++; else q = !q; }
    else if (c === "\n" && !q) n++;
  }
  return Math.max(0, n - 1);
}

fs.mkdirSync(SHEETS, { recursive: true });
console.log(`sheet ${SHEET_ID}`);

let failed = 0;
for (const [tab, file] of TABS) {
  const dest = path.join(SHEETS, file);
  try {
    const csv = await fetchTab(tab);
    const rows = rowCount(csv);

    // never let a truncated or emptied tab wipe a good local copy
    if (fs.existsSync(dest)) {
      const had = rowCount(fs.readFileSync(dest, "utf8"));
      if (had > 20 && rows < had * 0.5) {
        console.error(`  ${tab.padEnd(10)} REFUSED – ${rows} rows vs ${had} previously (>50% drop)`);
        failed++;
        continue;
      }
    }
    fs.writeFileSync(dest, csv.endsWith("\n") ? csv : csv + "\n", "utf8");
    console.log(`  ${tab.padEnd(10)} ${String(rows).padStart(5)} rows -> sheets/${file}`);
  } catch (e) {
    console.error(`  ${tab.padEnd(10)} FAILED – ${e.message}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} tab(s) could not be fetched. Not building on partial data.`);
  process.exit(1);
}
console.log("\nall tabs fetched");
