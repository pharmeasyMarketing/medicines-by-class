# -*- coding: utf-8 -*-
"""
Builds 03_class_content.csv and 04_faqs.csv from the class list produced by
extract_catalogue.py plus the seed copy in content.py.

    python3 src/prep/gen_content.py --out sheets/

Everything it writes lands as content_status=draft. Nothing publishes until a
medical reviewer flips that column and fills reviewer_name.
"""
import argparse, csv, json, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import CONTENT, SAFETY_COMMON, GENERIC_FAQ, HUB, CONDITIONS
from taxonomy import CLASS_CATEGORY

REVIEW_DATE = "2026-07-24"          # set by the build; overridden per row on review


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="sheets")
    a = ap.parse_args()

    classes = {}
    with open(os.path.join(a.out, "01_classes.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            classes[r["class_id"]] = r

    subs_by_class = defaultdict(list)
    counts = defaultdict(int)
    with open(os.path.join(a.out, "02_medicines.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            for cid in r["class_ids"].split("|"):
                if cid:
                    counts[cid] += 1
            s = (r.get("sub_class") or "").strip()
            primary = r["class_ids"].split("|")[0]
            if s and s != "Other" and s not in subs_by_class[primary]:
                subs_by_class[primary].append(s)

    content_rows, faq_rows, missing = [], [], []

    # ---- the directory hub itself ------------------------------------------
    content_rows.append([
        "_directory", HUB["meta_title"], HUB["meta_description"], HUB["intro"],
        HUB["what_heading"], HUB["what_md"],
        HUB["diff_heading"], HUB["diff_md"],
        HUB["how_heading"], HUB["how_md"],
        "\n".join(SAFETY_COMMON),
        "", "Reviewed by medical experts", "", REVIEW_DATE, REVIEW_DATE, "", "FALSE", "draft",
    ])
    for i, (q, ans) in enumerate(HUB["faqs"], 1):
        faq_rows.append(["_directory", i, q, ans, "draft"])

    # ---- one row per class --------------------------------------------------
    for cid, c in sorted(classes.items()):
        name = c["class_name"]
        seed = CONTENT.get(cid)
        if not seed:
            missing.append(cid)
            content_rows.append([cid, "", "", "", "", "", "", "", "", "",
                                 "\n".join(SAFETY_COMMON), "", "", "", "", "", "", "FALSE", "draft"])
            continue

        n = counts.get(cid, 0)
        subs = subs_by_class.get(cid, [])

        # sub-class paragraph is generated from the real data, so it can never
        # drift from what the page actually lists
        if len(subs) >= 2:
            listed = ", ".join(subs[:-1]) + " and " + subs[-1]
            sub_md = (f"Within this class you will find {listed}. Two medicines from different "
                      f"sub-classes are not alternatives to each other.")
            sub_heading = "Sub-classes you will find here"
        else:
            sub_md, sub_heading = "", ""

        meta_title = f"{name} - Buy Online at Best Price | PharmEasy"
        meta_desc = (f"Browse {n} {name.lower()} on PharmEasy. "
                     f"{seed['blurb']}. Compare packs, compositions and prices. "
                     f"100% genuine medicines.")[:158]

        content_rows.append([
            cid,
            meta_title[:70],
            meta_desc,
            seed["intro"],
            f"About {name}",
            seed["what"] + "\n\n" + seed["note"],
            sub_heading,
            sub_md,
            "Prescription and dosage",
            ("Medicines in this class are prescription-only unless the pack states otherwise. "
             "Always order the exact strength and dosage form written on your prescription, and "
             "continue any monitoring your doctor has advised."),
            "\n".join([seed["caution"]] + SAFETY_COMMON),
            "", "", "", REVIEW_DATE, REVIEW_DATE, "", "FALSE", "draft",
        ])

        seen, pos = set(), 0
        for q, ans in list(seed["faq"]) + GENERIC_FAQ:
            if q in seen:
                continue
            seen.add(q)
            pos += 1
            faq_rows.append([cid, pos, q, ans, "draft"])

    write(os.path.join(a.out, "03_class_content.csv"),
          ["class_id", "meta_title", "meta_description", "intro_md", "about_heading", "about_md",
           "subclass_heading", "subclass_md", "prescription_heading", "prescription_md",
           "safety_bullets_md", "reviewer_name", "reviewer_credentials", "reviewer_profile_url",
           "medically_reviewed_on", "content_last_updated", "canonical_override", "noindex",
           "content_status"],
          content_rows)

    write(os.path.join(a.out, "04_faqs.csv"),
          ["class_id", "position", "question", "answer_md", "status"], faq_rows)

    # short_desc lives on the class row (it is the directory card blurb) but is
    # authored here alongside the rest of the copy -- push it back into 01.
    path01 = os.path.join(a.out, "01_classes.csv")
    with open(path01, newline="", encoding="utf-8") as f:
        rdr = csv.reader(f)
        head = next(rdr)
        rows = list(rdr)
    for col in ("conditions", "category"):
        if col not in head:
            head.append(col)
            for r in rows:
                r.append("")
    i_id, i_desc = head.index("class_id"), head.index("short_desc")
    i_cond = head.index("conditions")
    filled = cond = 0
    for r in rows:
        seed = CONTENT.get(r[i_id])
        if seed and not r[i_desc]:
            r[i_desc] = seed["blurb"]
            filled += 1
        i_cat, i_name = head.index("category"), head.index("class_name")
        if not r[i_cat]:
            r[i_cat] = CLASS_CATEGORY.get(r[i_name], "")
        terms = CONDITIONS.get(r[i_id])
        if terms and not r[i_cond]:
            r[i_cond] = terms
            cond += 1
    with open(path01, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(head)
        w.writerows(rows)
    print(f"  updated 01_classes.csv     short_desc x{filled}, conditions x{cond}")

    if missing:
        print(f"\n!! {len(missing)} classes have no seed copy -> empty draft rows:")
        for m in missing:
            print("   ", m)
    else:
        print("\nevery published class has seed copy")


def write(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {os.path.basename(path):22} {len(rows):>6,} rows")


if __name__ == "__main__":
    main()
