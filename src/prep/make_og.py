# -*- coding: utf-8 -*-
"""
Per-page Open Graph cards, 1200x630 PNG.

WhatsApp, Slack and Twitter all want a real raster at a known size — an SVG
or a missing image gets you a bare grey link. One card per class plus the hub,
drawn from the same sheet data the page uses, so a shared link always shows
the class name, its category and how many medicines are in it.

    python3 src/prep/make_og.py
"""
import csv, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "dist", "og")
W, H = 1200, 630

TEAL, INK, MUTED = (16, 132, 126), (48, 54, 60), (110, 120, 126)

# category -> (pastel, accent), mirroring CATS in the builder
CATS = {
    "Diabetes care": ((228, 244, 239), (14, 138, 125)), "Heart health": ((252, 235, 239), (206, 79, 105)),
    "Infection care": ((251, 243, 220), (169, 124, 38)), "Pain care": ((239, 237, 251), (101, 88, 192)),
    "Allergy care": ((229, 240, 252), (53, 121, 190)), "Respiratory care": ((230, 244, 238), (42, 133, 103)),
    "Digestive care": ((252, 239, 228), (187, 111, 54)), "Hormone care": ((237, 245, 226), (90, 136, 47)),
    "Neurology care": ((233, 236, 250), (72, 89, 176)), "Mental wellness": ((231, 243, 241), (41, 122, 115)),
    "Men's health": ((231, 239, 250), (58, 105, 169)), "Women's health": ((251, 235, 243), (174, 78, 128)),
    "Bone health": ((236, 242, 231), (90, 133, 71)), "Skin care": ((252, 237, 233), (190, 100, 77)),
    "Eye & ear care": ((230, 241, 251), (55, 121, 159)), "Kidney care": ((228, 242, 242), (37, 124, 130)),
    "Liver care": ((243, 240, 225), (132, 116, 43)), "Blood health": ((250, 235, 235), (185, 82, 76)),
    "Immunity care": ((232, 241, 237), (55, 122, 95)), "Nutrition": ((251, 242, 223), (175, 128, 44)),
    "Dental care": ((236, 240, 246), (85, 108, 144)), "Cancer care": ((240, 234, 246), (109, 75, 147)),
}

FONT_DIRS = ["/System/Library/Fonts", "/System/Library/Fonts/Supplemental", "/Library/Fonts"]
def font(size, bold=False):
    names = (["Helvetica.ttc", "HelveticaNeue.ttc", "Arial Bold.ttf", "Arial.ttf"] if bold
             else ["Helvetica.ttc", "HelveticaNeue.ttc", "Arial.ttf"])
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size, index=1 if (bold and p.endswith(".ttc")) else 0)
                except Exception:
                    continue
    return ImageFont.load_default()


def wrap(draw, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def card(title, category, count_label, blurb, path):
    tint, accent = CATS.get(category, ((231, 243, 241), TEAL))
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    # soft diagonal wash, teal -> blue, the same feel as the page hero
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(233 + 14 * t), int(246 - 2 * t), int(241 + 10 * t)))

    # decorative discs, echoing the hero geometry
    d.ellipse([W - 250, -170, W + 130, 210], fill=(255, 255, 255))
    d.ellipse([W - 165, H - 190, W + 120, H + 95], fill=tuple(min(255, c + 8) for c in tint))

    # category tile
    d.rounded_rectangle([80, 90, 176, 186], radius=24, fill=tint)
    d.ellipse([112, 122, 144, 154], outline=accent, width=6)

    # category eyebrow
    fe = font(26, True)
    d.text((200, 118), (category or "Medicine class").upper(), font=fe, fill=accent)

    # title
    ft = font(72, True)
    lines = wrap(d, title, ft, W - 240)[:2]
    y = 210
    for ln in lines:
        d.text((80, y), ln, font=ft, fill=INK)
        y += 84

    # blurb
    fb = font(30)
    for ln in wrap(d, blurb, fb, W - 340)[:2]:
        d.text((80, y + 14), ln, font=fb, fill=MUTED)
        y += 42

    # count pill
    fc = font(30, True)
    tw = d.textlength(count_label, font=fc)
    d.rounded_rectangle([80, H - 150, 80 + tw + 56, H - 88], radius=31, fill=TEAL)
    d.text((108, H - 138), count_label, font=fc, fill=(255, 255, 255))

    # brand lockup
    fbrand = font(34, True)
    bw = d.textlength("PharmEasy", font=fbrand)
    d.text((W - 80 - bw, H - 136), "PharmEasy", font=fbrand, fill=TEAL)
    fs = font(22)
    sw = d.textlength("Take it easy", font=fs)
    d.text((W - 80 - sw, H - 168), "Take it easy", font=fs, fill=accent)

    d.rectangle([0, H - 12, W, H], fill=TEAL)
    img.save(path, "PNG", optimize=True)


def read(name):
    with open(os.path.join(ROOT, "sheets", name), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    os.makedirs(OUT, exist_ok=True)
    classes = [c for c in read("01_classes.csv") if c.get("status") == "live"]
    counts = {}
    for m in read("02_medicines.csv"):
        if m.get("status") != "live":
            continue
        for cid in (m.get("class_ids") or "").split("|"):
            if cid:
                counts[cid] = counts.get(cid, 0) + 1

    built = 0
    for c in classes:
        n = counts.get(c["class_id"], 0)
        if not n:
            continue
        card(c["class_name"], c.get("category", ""), f"{n} medicines",
             c.get("short_desc") or "Browse this class on PharmEasy.",
             os.path.join(OUT, f"{c['slug']}.png"))
        built += 1

    card("Medicines by Class", "Diabetes care", f"{len(classes)} classes",
         "Browse medicines by their therapeutic or drug class.",
         os.path.join(OUT, "index.png"))
    built += 1
    print(f"  wrote {built} OG cards -> dist/og/")


if __name__ == "__main__":
    main()
