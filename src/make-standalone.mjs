/* =========================================================================
   Packs one built page into a single self-contained .html file – CSS and JS
   inlined, plus a small cart test panel – so add-to-cart can be exercised by
   double-clicking the file, with no server.

       node src/make-standalone.mjs blood-pressure-medicines
   ========================================================================= */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const slug = process.argv[2] || "blood-pressure-medicines";
const src = path.join(DIST, slug, "index.html");
if (!fs.existsSync(src)) {
  console.error(`no build at dist/${slug}/ – run: node src/build.mjs`);
  process.exit(1);
}

let html = fs.readFileSync(src, "utf8");
const read = f => fs.readFileSync(path.join(ROOT, "assets", f), "utf8");

// NOTE: the replacement MUST be a function. With a string replacement, "$$"
// is an escape sequence meaning "a literal $", so every $$(...) helper in
// app.js would silently collapse to $(...) and the script would die on the
// first .forEach. Functions disable that substitution entirely.
html = html.replace(
  /<link rel="stylesheet" href="[^"]*tokens\.css">\s*<link rel="stylesheet" href="[^"]*styles\.css">/,
  () => `<style>\n${read("tokens.css")}\n${read("styles.css")}\n</style>`
);

html = html.replace(
  /<script src="[^"]*app\.js"[^>]*><\/script>/,
  () => `<script>\n${read("app.js")}\n</script>`
);

/* ---- cart test panel -------------------------------------------------- */
const panel = `
<style>
  #cart-test { position: fixed; right: 14px; bottom: 14px; z-index: 900; width: 330px;
    max-height: 62vh; overflow: auto; background: #fff; border: 1px solid var(--line);
    border-radius: 12px; box-shadow: 0 8px 28px rgba(48,54,60,.16); font-family: var(--font-sans);
    font-size: 12px; color: var(--fg-1); }
  #cart-test header { display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-bottom: 1px solid var(--line-2); font-weight: 700;
    position: sticky; top: 0; background: #fff; }
  #cart-test .dot { width: 8px; height: 8px; border-radius: 50%; background: #45a081; display: inline-block; margin-right: 6px; }
  #cart-test .body { padding: 10px 12px; }
  #cart-test table { width: 100%; border-collapse: collapse; }
  #cart-test td { padding: 4px 0; vertical-align: top; border-bottom: 1px solid var(--line-2); }
  #cart-test td:last-child { text-align: right; white-space: nowrap; color: var(--fg-2); }
  #cart-test .k { color: var(--fg-3); }
  #cart-test .url { word-break: break-all; background: var(--bg); padding: 6px 8px;
    border-radius: 6px; margin-top: 8px; font-size: 11px; }
  #cart-test .empty { color: var(--fg-3); padding: 6px 0; }
  #cart-test button { border: 1px solid var(--line); background: #fff; border-radius: 6px;
    padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  #cart-test .warn { margin-top: 8px; padding: 6px 8px; border-radius: 6px;
    background: #fef3e1; color: #8a5a00; font-size: 11px; }
</style>
<div id="cart-test">
  <header><span><span class="dot"></span>Cart test panel</span>
    <button type="button" id="ct-clear">Clear</button></header>
  <div class="body">
    <div><span class="k">storage:</span> <b id="ct-store">–</b>
         &nbsp;<span class="k">items:</span> <b id="ct-total">0</b></div>
    <table id="ct-rows"></table>
    <div class="k" style="margin-top:8px">Cart link the header will open:</div>
    <div class="url" id="ct-url">–</div>
    <div id="ct-warn"></div>
  </div>
</div>
<script>
(function () {
  var KEY = "pe_mbc_cart";
  var store = "localStorage";
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); }
  catch (e) { store = "in-memory (localStorage blocked)"; }
  document.getElementById("ct-store").textContent = store;
  if (store !== "localStorage") {
    document.getElementById("ct-warn").innerHTML =
      '<div class="warn">This browser blocks localStorage on file:// URLs, so the cart ' +
      'will not survive a reload. Add/remove still works in-page. Serve over http to test persistence.</div>';
  }

  function render() {
    var cart = {};
    try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    var skus = Object.keys(cart);
    var total = skus.reduce(function (n, k) { return n + cart[k].qty; }, 0);
    document.getElementById("ct-total").textContent = total;
    document.getElementById("ct-rows").innerHTML = skus.length
      ? skus.map(function (k) {
          return "<tr><td>" + cart[k].name + "<br><span class='k'>" + k +
                 "</span></td><td>x" + cart[k].qty + "<br>\\u20b9" + cart[k].price + "</td></tr>";
        }).join("")
      : "<tr><td class='empty' colspan='2'>Cart is empty – click Add on any card</td></tr>";
    var a = document.querySelector("[data-cart-link]");
    document.getElementById("ct-url").textContent = a ? a.getAttribute("href") : "–";
  }

  document.getElementById("ct-clear").addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });

  // repaint whenever anything on the page changes the cart
  document.addEventListener("click", function () { setTimeout(render, 60); });
  window.addEventListener("storage", render);
  setTimeout(render, 300);
})();
</script>`;

html = html.replace("</body>", () => panel + "\n</body>");

// make PDP links absolute so they still work from a file:// page
html = html.replace(/href="\/online-medicine-order\//g, () => 'href="https://pharmeasy.in/online-medicine-order/');
html = html.replace(/href="\/medicines-by-class\//g, () => 'href="https://pharmeasy.in/medicines-by-class/');

const out = path.join(ROOT, `cart-test-${slug}.html`);
fs.writeFileSync(out, html, "utf8");
console.log(`wrote ${path.basename(out)}  (${(fs.statSync(out).size / 1024).toFixed(0)} KB, self-contained)`);
