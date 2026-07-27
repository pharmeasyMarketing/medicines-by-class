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
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "sheets");

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) {
  console.error("SHEET_ID is not set. Pass it as an env var or repo variable.");
  process.exit(1);
}
// Service-account key JSON. Set this and the sheet can stay private —
// share it with the service account's client_email as Viewer.
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/* tab name in the Google Sheet -> local file the build reads */
const TABS = [
  ["classes",   "01_classes.csv"],
  ["medicines", "02_medicines.csv"],
  ["content",   "03_class_content.csv"],
  ["faqs",      "04_faqs.csv"],
  ["redirects", "05_redirects.csv"],
];

/* ---------------------------------------------------------------- auth --
   Two ways in:
     1. GOOGLE_SERVICE_ACCOUNT_JSON -> Sheets API, sheet stays private.
        Share the sheet with the key's client_email as Viewer.
     2. nothing set -> the gviz CSV endpoint, which needs the sheet to be
        "anyone with the link". Only viable if your org permits that.
   ------------------------------------------------------------------------ */
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(signer.sign(sa.private_key))}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

/** Sheets API returns a 2-D array; turn it back into RFC4180 CSV. */
function toCSV(values) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const width = values.reduce((w, r) => Math.max(w, r.length), 0);
  return values
    .map((r) => Array.from({ length: width }, (_, i) => cell(r[i])).join(","))
    .join("\n") + "\n";
}

let TOKEN = null;
async function fetchViaApi(tab) {
  const u = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
            `${encodeURIComponent(tab)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
  const r = await fetch(u, { headers: { authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  const values = (await r.json()).values || [];
  if (!values.length) throw new Error("tab is empty");
  return toCSV(values);
}

const url = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
  `?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

async function fetchTab(tab) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (TOKEN) return await fetchViaApi(tab);
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

if (SA_JSON) {
  const sa = JSON.parse(SA_JSON);
  TOKEN = await accessToken(sa);
  console.log(`auth   service account (${sa.client_email})`);
} else {
  console.log("auth   none – falling back to the public gviz endpoint");
  console.log("       (set GOOGLE_SERVICE_ACCOUNT_JSON to read a private sheet)");
}

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
