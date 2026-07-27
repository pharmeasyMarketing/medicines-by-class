/* =========================================================================
   Sheet validation. Runs before every build so a bad cell fails the pipeline
   loudly instead of quietly publishing a broken page.
       node src/validate.mjs
   Exit 1 = errors (build must stop). Warnings do not block.
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "sheets");

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
  return { head, rows: rows.filter(r => r.some(v => v !== ""))
    .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()]))) };
}

const errors = [], warns = [];
const err = m => errors.push(m);
const warn = m => warns.push(m);

const REQUIRED = {
  "01_classes.csv": ["class_id", "slug", "class_name", "status"],
  "02_medicines.csv": ["sku", "medicine_name", "slug", "class_ids", "status"],
  "03_class_content.csv": ["class_id", "content_status"],
  "04_faqs.csv": ["class_id", "position", "question", "answer_md"],
};

const data = {};
for (const [file, cols] of Object.entries(REQUIRED)) {
  const p = path.join(SHEETS, file);
  if (!fs.existsSync(p)) { err(`${file}: missing`); continue; }
  const { head, rows } = parseCSV(fs.readFileSync(p, "utf8"));
  for (const c of cols) if (!head.includes(c)) err(`${file}: required column "${c}" is missing`);
  data[file] = rows;
}
if (errors.length) { report(); process.exit(1); }

const classes = data["01_classes.csv"];
const meds = data["02_medicines.csv"];
const content = Object.fromEntries(data["03_class_content.csv"].map(r => [r.class_id, r]));
const faqs = data["04_faqs.csv"];

/* ---- classes ------------------------------------------------------------ */
const seenId = new Set(), seenSlug = new Set();
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const c of classes) {
  if (seenId.has(c.class_id)) err(`01: duplicate class_id "${c.class_id}"`);
  seenId.add(c.class_id);
  if (c.status === "live") {
    if (seenSlug.has(c.slug)) err(`01: duplicate slug "${c.slug}"`);
    seenSlug.add(c.slug);
    if (!SLUG.test(c.slug)) err(`01: slug "${c.slug}" is not url-safe`);
    if (!c.class_name) err(`01: ${c.class_id} has no class_name`);
  }
  if (c.status === "redirect" && !c.redirect_to) err(`01: ${c.class_id} is a redirect with no redirect_to`);
}

/* ---- medicines ---------------------------------------------------------- */
const liveIds = new Set(classes.filter(c => c.status === "live").map(c => c.class_id));
const perClass = {};
const seenSku = new Set();
for (const m of meds) {
  if (m.status !== "live") continue;
  if (seenSku.has(m.sku)) err(`02: duplicate sku "${m.sku}"`);
  seenSku.add(m.sku);
  if (!/^\d+$/.test(m.sku)) err(`02: sku "${m.sku}" is not a numeric product id – the pricing API will 404`);
  if (!m.slug) err(`02: ${m.sku} has no slug, its card would link nowhere`);
  const ids = m.class_ids.split("|").filter(Boolean);
  if (!ids.length) err(`02: ${m.sku} has no class_ids`);
  for (const id of ids) {
    if (!liveIds.has(id)) warn(`02: ${m.sku} references class "${id}" which is not live`);
    perClass[id] = (perClass[id] || 0) + 1;
  }
}

/* ---- content ------------------------------------------------------------ */
for (const c of classes.filter(c => c.status === "live")) {
  const n = perClass[c.class_id] || 0;
  if (n === 0) err(`01: class "${c.class_id}" is live but has no medicines – it would publish an empty page`);
  else if (n < 5) warn(`01: class "${c.class_id}" has only ${n} medicines (thin)`);

  const k = content[c.class_id];
  if (!k) { err(`03: no content row for live class "${c.class_id}"`); continue; }
  if (k.content_status === "published") {
    if (!k.meta_title) err(`03: ${c.class_id} published without meta_title`);
    if (!k.meta_description) err(`03: ${c.class_id} published without meta_description`);
    if (!k.reviewer_name) err(`03: ${c.class_id} published without reviewer_name – medical copy needs a named reviewer`);
  }
  if (k.meta_title && k.meta_title.length > 70) warn(`03: ${c.class_id} meta_title is ${k.meta_title.length} chars (>70 truncates)`);
  if (k.meta_description && k.meta_description.length > 160) warn(`03: ${c.class_id} meta_description is ${k.meta_description.length} chars (>160 truncates)`);

  const banned = /\b(cure[sd]?|treats?|guarantee[sd]?|best medicine|safest|100% effective)\b/i;
  for (const f of ["intro_md", "about_md", "subclass_md", "prescription_md"]) {
    if (k[f] && banned.test(k[f]))
      err(`03: ${c.class_id}.${f} uses a promissory claim – copy rule is "used for" / "used in the management of"`);
  }
}

/* ---- faqs --------------------------------------------------------------- */
const faqSeen = new Set();
for (const f of faqs) {
  const key = f.class_id + "#" + f.position;
  if (faqSeen.has(key)) err(`04: duplicate position ${f.position} for "${f.class_id}"`);
  faqSeen.add(key);
  if (!f.question || !f.answer_md) err(`04: ${f.class_id} #${f.position} is missing a question or answer`);
  if (f.answer_md && f.answer_md.length < 30) warn(`04: ${f.class_id} #${f.position} answer is very short`);
}

report();
process.exit(errors.length ? 1 : 0);

function report() {
  for (const w of warns) console.log(`  warn   ${w}`);
  for (const e of errors) console.log(`  ERROR  ${e}`);
  console.log(`\nvalidation: ${errors.length} error(s), ${warns.length} warning(s)`);
}
