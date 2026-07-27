# -*- coding: utf-8 -*-
"""
One-time prep: catalogue dump + target URL list  ->  the Google Sheet CSVs.

This is NOT the nightly build. It runs when you get a fresh catalogue dump.
The nightly build reads the Google Sheets, not this.

    python3 src/prep/extract_catalogue.py \
        --catalogue "/path/to/query_result.csv" \
        --targets   "/path/to/Navigation links - Sheet8.csv" \
        --out sheets/
"""
import argparse, csv, json, os, re, sys, unicodedata
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from taxonomy import (TAG_TO_CLASS, MOLECULE_SUBCLASS, CLASS_ICON, POPULAR,
                      MIN_PRODUCTS_FOR_PAGE)

csv.field_size_limit(sys.maxsize)
THERAPY_RX = re.compile(r'"([^"]+)"')


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().replace("'", "")          # women's -> womens, not women-s
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")


def titlecase_tag(tag):
    """ANTI-DIABETIC -> Anti-diabetic ; DRUGS FOR PILES -> Piles"""
    t = tag.replace("DRUGS FOR ", "").replace("DRUG FOR ", "")
    small = {"AND", "FOR", "OF"}
    words = []
    for w in t.split():
        if "-" in w:
            words.append("-".join(p.capitalize() for p in w.split("-")))
        elif w in small and words:
            words.append(w.lower())
        elif w.isupper() and len(w) <= 5 and any(c.isdigit() for c in w):
            words.append(w)          # DPP-4, SGLT2 style
        else:
            words.append(w.capitalize())
    return " ".join(words)


def truthy(v):
    return str(v).strip().lower() in ("1", "true", "yes", "t")


def clean_composition(raw):
    """
    METFORMIN HYDROCHLORIDE(500.0 MG)+GLIMEPIRIDE(1.0 MG)
      -> Metformin Hydrochloride 500mg + Glimepiride 1mg
    """
    if not raw:
        return ""
    parts = []
    for chunk in raw.split("+"):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = re.match(r"^(.*?)\(([\d.]+)\s*([A-Za-z%/]+)\)$", chunk)
        if m:
            name, qty, unit = m.groups()
            qty = qty.rstrip("0").rstrip(".") if "." in qty else qty
            parts.append(f"{name.strip().title()} {qty}{unit.lower()}")
        else:
            parts.append(re.sub(r"\s+", " ", chunk).title())
    return " + ".join(parts)


# how many distinct therapy tags feed each class
TAGS_PER_CLASS = Counter(TAG_TO_CLASS.values())


def derive_subclass(class_name, molecule, tag):
    """
    Sub-class comes from the molecule map where we have one (it gives the real
    pharmacological grouping users search for). Otherwise fall back to the
    clinical tag, but only where the class is built from several tags -- a
    single-tag class has no sub-structure to show.
    """
    rules = MOLECULE_SUBCLASS.get(class_name)
    if rules and molecule:
        mol = molecule.upper()
        hits = []
        for keys, label in rules:
            if any(k in mol for k in keys) and label not in hits:
                hits.append(label)
        if len(hits) > 1:
            return "Combinations"
        if hits:
            return hits[0]
    if TAGS_PER_CLASS[class_name] > 1 and tag:
        label = titlecase_tag(tag)
        # "Antibiotic" under Antibiotics, "Steroid" under Steroids etc. is a
        # tautology -- these are the generic members of their own class.
        a, b = slugify(label).replace("-", ""), slugify(class_name).replace("-", "")
        if a in b or b in a:
            return "Other"
        return label
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalogue", required=True)
    ap.add_argument("--targets", required=True)
    ap.add_argument("--out", default="sheets")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    # ---- 1. target ids + their real PDP slugs --------------------------------
    slug_by_id, order = {}, {}
    with open(a.targets, newline="", encoding="utf-8") as f:
        for i, row in enumerate(csv.DictReader(f)):
            pid = (row.get("Product Ids") or "").strip()
            url = (row.get("Urls") or "").strip()
            if not pid.isdigit():
                continue
            slug_by_id[pid] = url.rstrip("/").split("/")[-1] if url else ""
            order.setdefault(pid, i)
    print(f"targets            : {len(slug_by_id):,}")

    # ---- 2. pull those rows out of the dump ---------------------------------
    prods, skipped = [], Counter()
    with open(a.catalogue, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            pid = (row.get("product_id") or "").strip()
            if pid not in slug_by_id:
                continue
            # Verified against the live site: every product in the target list has a
            # 200 PDP regardless of flag, and `is_live=false` products still return a
            # real price from the API -- they are out of stock, not delisted. So the
            # only hard exclusions are the ones we must not merchandise at all.
            if truthy(row.get("is_banned")):
                skipped["banned"] += 1
                continue
            if truthy(row.get("is_discontinued")):
                skipped["discontinued"] += 1
                continue
            if truthy(row.get("is_storefront_disabled")):
                skipped["storefront disabled"] += 1
                continue
            tags = [t.strip() for t in THERAPY_RX.findall(row.get("therapy") or "") if t.strip()]
            classes, unmapped = [], []
            for t in tags:
                c = TAG_TO_CLASS.get(t)
                if c and c not in classes:
                    classes.append(c)
                elif not c:
                    unmapped.append(t)
            if not classes:
                skipped["no mapped class"] += 1
                for u in unmapped:
                    skipped[f"  unmapped tag: {u}"] += 1
                continue
            prods.append({"row": row, "pid": pid, "tags": tags, "classes": classes})

    print(f"live + classified  : {len(prods):,}")
    for k, v in skipped.most_common():
        print(f"  skipped {v:5d}  {k}")

    # ---- 3. class sizes, apply the thin-page threshold -----------------------
    size = Counter()
    for p in prods:
        for c in p["classes"]:
            size[c] += 1

    live_classes = {c for c, n in size.items() if n >= MIN_PRODUCTS_FOR_PAGE}
    thin = {c: n for c, n in size.items() if n < MIN_PRODUCTS_FOR_PAGE}
    if thin:
        print(f"\nbelow {MIN_PRODUCTS_FOR_PAGE}-product threshold -> not published:")
        for c, n in sorted(thin.items(), key=lambda x: -x[1]):
            print(f"  {n:3d}  {c}")

    # ---- 4. medicines sheet -------------------------------------------------
    med_rows, subclasses = [], defaultdict(Counter)
    for p in sorted(prods, key=lambda p: order.get(p["pid"], 1 << 30)):
        r, pid = p["row"], p["pid"]
        cls = [c for c in p["classes"] if c in live_classes]
        if not cls:
            continue
        mol = (r.get("molecule_name") or "").strip()
        if mol.upper() in ("UNSURE", "NOT APPLICABLE"):
            mol = ""
        primary = cls[0]
        src_tags = [t for t in p["tags"] if TAG_TO_CLASS.get(t) == primary]
        sub = derive_subclass(primary, mol, src_tags[0] if src_tags else "")
        if sub:
            subclasses[primary][sub] += 1

        pack = (r.get("pack_name") or "").strip()
        form = (r.get("packform_name") or "").strip().title()
        pack_size = f"{pack.title()} in {form}" if pack and form else (pack.title() or form)

        med_rows.append([
            pid,
            (r.get("product_name") or "").strip().title(),
            slug_by_id.get(pid, ""),
            clean_composition((r.get("composition") or "").strip()),
            mol.title(),
            pack_size,
            (r.get("dosage_form") or "").strip().title(),
            (r.get("manufacturer_name") or "").strip().title(),
            "|".join(cls_slug(c) for c in cls),
            sub,
            "TRUE" if truthy(r.get("is_rx_required")) else "FALSE",
            "TRUE" if truthy(r.get("is_chronic")) else "FALSE",
            "TRUE" if truthy(r.get("is_refrigerated")) else "FALSE",
            (r.get("schedule") or "").strip(),
            (r.get("similar_group_id") or "").strip(),
            (r.get("product_curated_mrp") or r.get("computed_mrp") or "").strip(),
            # seed availability so the card renders a sane state before the API
            # answers; the live call always overrides this.
            "TRUE" if truthy(r.get("is_live")) else "FALSE",
            order.get(pid, 9999) + 1,
            "live",
        ])

    write_csv(os.path.join(a.out, "02_medicines.csv"),
              ["sku", "medicine_name", "slug", "composition", "molecule_name", "pack_size",
               "dosage_form", "manufacturer", "class_ids", "sub_class", "rx_required",
               "is_chronic", "is_refrigerated", "schedule", "substitute_group_id",
               "catalogue_mrp", "expected_sellable", "sort_rank", "status"],
              med_rows)

    # ---- 5. classes sheet ---------------------------------------------------
    pop_rank = {c: i + 1 for i, c in enumerate(POPULAR)}
    cls_rows = []
    for name in sorted(live_classes):
        cid = cls_slug(name)
        subs = [s for s, _ in subclasses[name].most_common()]
        cls_rows.append([
            cid, cid, name, "", "",
            CLASS_ICON.get(name, "pill"),
            "TRUE" if name in pop_rank else "FALSE",
            pop_rank.get(name, ""),
            "TRUE", "",
            "|".join(subs), "", "",
            size[name],
            "live", "",
            "0.9" if name in pop_rank else "0.8",
        ])

    write_csv(os.path.join(a.out, "01_classes.csv"),
              ["class_id", "slug", "class_name", "h1_override", "short_desc", "icon",
               "is_popular", "popular_rank", "rx_required", "parent_class_id", "sub_classes",
               "related_class_ids", "synonyms", "catalogue_count_override", "status",
               "redirect_to", "sitemap_priority"],
              cls_rows)

    json.dump({"classes": sorted(live_classes),
               "sizes": dict(size),
               "subclasses": {k: dict(v) for k, v in subclasses.items()}},
              open(os.path.join(a.out, "_stats.json"), "w"), indent=1)

    print(f"\nclasses published  : {len(live_classes)}")
    print(f"medicines published: {len(med_rows):,}")


def cls_slug(name):
    return slugify(name)


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {os.path.basename(path):22} {len(rows):>6,} rows")


if __name__ == "__main__":
    main()
