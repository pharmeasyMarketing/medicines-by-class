/* =========================================================================
   Medicines by Class – behaviour
   Progressive enhancement only. Every class link, every medicine card and
   every FAQ answer already exists in the HTML; this file filters, sorts and
   refreshes prices. With JS off the page is a complete, crawlable document.
   ========================================================================= */
(function () {
  "use strict";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqMobile = window.matchMedia("(max-width: 767px)");

  function debounce(fn, ms) {
    var t; return function () {
      var a = arguments, c = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* URL state -------------------------------------------------------------- */
  function setParams(patch) {
    var u = new URL(window.location.href);
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v === "" || v == null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    });
    history.replaceState(null, "", u.pathname + (u.search ? u.search : "") + u.hash);
  }
  var params = new URLSearchParams(window.location.search);

  /* =======================================================================
     Local cart
     Items are held in localStorage and handed off to pharmeasy.in/cart at
     checkout. This page cannot write to the real cart from another origin,
     so it keeps its own and passes the skus across.
     ======================================================================= */
  var CART_KEY = "pe_mbc_cart";
  var CART_MAX = 20;            // total units the cart will accept
  var cart = (function () {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch (e) { return {}; }
  })();

  function cartSave() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    cartPaintCount();
  }
  function cartQty(sku) { return (cart[sku] && cart[sku].qty) || 0; }
  function cartTotalItems() {
    return Object.keys(cart).reduce(function (n, k) { return n + cart[k].qty; }, 0);
  }
  function cartPaintCount() {
    var n = cartTotalItems();
    // every visible stepper must reflect the basket-wide cap, not just the
    // line that was last touched
    var full = n >= CART_MAX;
    $$(".qty-b[data-d='1']").forEach(function (b) { b.disabled = full; });
    // only gate the buttons that are otherwise addable; an out-of-stock card
    // stays disabled for its own reason and must not be re-enabled here
    $$(".btn-add").forEach(function (b) {
      var card = b.closest(".med");
      if (card && card.dataset.avail === "in") b.disabled = full;
    });
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("on", n > 0);
    });
    var dr = $("#cart-drawer");
    if (dr && !dr.hidden) drawerRender();
    // pharmeasy.in/cart ignores query params — the handoff seeds persist:cart
    // instead, so the link just points at the cart.
  }

  /* ---------------------------------------------------------------------
     Real PharmEasy cart. Reverse-engineered from the PDP bundle:
       POST {cartApi}/cart/addToCart  {productId, productType, productName, quantity}
       GET  {cartApi}/cart/getCartCount
     getCartCount answers for guests; addToCart returns 401 until logged in.
     Both are same-origin on pharmeasy.in, so the session cookie flows on its
     own -- there is no token to manage here.
     Off-origin (or logged out) we keep the local cart so the UI still works.
     --------------------------------------------------------------------- */
  function cartApiBase() {
    var b = (window.PE_CONFIG || {}).cartApi;
    if (!b) return null;
    // only usable same-origin; a cross-origin POST has no session cookie
    try {
      var host = new URL(b, location.href).host;
      if (host !== location.host) return null;
    } catch (e) { return null; }
    return b.replace(/\/$/, "");
  }

  function serverAdd(card, qty) {
    var base = cartApiBase();
    if (!base) return Promise.resolve({ skipped: true });
    return fetch(base + "/cart/addToCart", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        productId: Number(card.dataset.sku),
        productType: Number(card.dataset.ptype || 1),
        productName: card.dataset.name,
        quantity: qty
      })
    }).then(function (r) {
      if (r.status === 401) return { needsLogin: true };
      if (!r.ok) return { failed: true };
      return r.json().then(function (d) { return { ok: true, data: d }; });
    }).catch(function () { return { failed: true }; });
  }

  function serverCount() {
    var base = cartApiBase();
    if (!base) return Promise.resolve(null);
    return fetch(base + "/cart/getCartCount", { credentials: "include", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && d.status === 1 ? d.data : null; })
      .catch(function () { return null; });
  }

  /* PharmEasy has no guest cart -- their own PDP opens a login modal for
     logged-out users. So we accept the add locally straight away (the UI
     responds instantly, exactly as if it worked), mark it unsynced, and push
     the whole queue to the real cart the moment a session exists. */
  function pending() {
    return Object.keys(cart).filter(function (k) { return !cart[k].synced; });
  }

  function refreshServerCount() {
    return serverCount().then(function (n) {
      if (n != null) $$("[data-cart-count]").forEach(function (el) {
        el.textContent = n; el.classList.toggle("on", n > 0);
      });
      return n;
    });
  }

  function flushPending() {
    var todo = pending();
    if (!todo.length || !cartApiBase()) return Promise.resolve({ done: true });
    return todo.reduce(function (chain, sku) {
      return chain.then(function (state) {
        if (state.needsLogin) return state;
        var item = cart[sku];
        var stub = { dataset: { sku: sku, ptype: item.ptype || 1, name: item.name } };
        return serverAdd(stub, item.qty).then(function (res) {
          if (res.needsLogin) return { needsLogin: true };
          if (res.ok) { cart[sku].synced = true; cartSave(); }
          return state;
        });
      });
    }, Promise.resolve({})).then(function (state) {
      if (!state.needsLogin) refreshServerCount();
      paintSyncNote();
      return state;
    });
  }

  function paintSyncNote() {
    var n = pending().length;
    $$("[data-sync-note]").forEach(function (el) {
      el.textContent = "";
      el.hidden = !n;
    });
  }

  function cartLimitNote(show) {
    var el = $("[data-cart-banner]");
    if (!el) return;
    if (!show) return;
    el.hidden = false;
    el.className = "cart-banner waiting";
    el.innerHTML = "<span>Cart limit reached – you can add up to " + CART_MAX +
      " medicines in one order.</span>";
    clearTimeout(cartLimitNote._t);
    cartLimitNote._t = setTimeout(function () { el.hidden = true; }, 4000);
  }

  function cartAdd(card, delta) {
    var sku = card.dataset.sku;
    var q = cartQty(sku) + delta;

    // cap the whole basket, not just one line
    if (delta > 0 && cartTotalItems() + delta > CART_MAX) {
      cartLimitNote(true);
      return;
    }
    if (q <= 0) delete cart[sku];
    else cart[sku] = { qty: q, name: card.dataset.name, pack: card.dataset.pack,
                       href: card.dataset.href, price: card.dataset.price,
                       ptype: card.dataset.ptype || 1, synced: false };
    cartSave();
    paintAddControl(card);   // UI updates immediately, logged in or not

    serverAdd(card, Math.max(0, q)).then(function (res) {
      if (res.ok && cart[sku]) { cart[sku].synced = true; cartSave(); refreshServerCount(); }
      paintSyncNote();
    });
  }

  /* ---------------------------------------------------------------------
     CART HANDOFF — seed the guest cart, exactly how the medicine PWA does it.

     Reverse-engineered from the PDP bundle (chunk 1547):
       KEY  "persist:cart"            (constants: dA.PERSIST_CART)
       shape { localCart: "<json array>", localCartCount: "N", cartItemsCount: "N" }
       item  { productId: "44140", productName: "...", quantity: 2 }

     The cart page rehydrates from that on load, so a guest lands on a
     PRE-FILLED cart and only meets the login wall at "Add Delivery Address"
     — the same flow as adding from a PDP. No bouncing to /login first.

     Login state can't be read from JS (the session cookie is httpOnly), so we
     ask the server once on load: /api/delivery/fetchAddresses returns 200 when
     signed in and 401 when not. Verified live.
     --------------------------------------------------------------------- */
  var PERSIST_CART = "persist:cart";

  var LOGIN_CHECK = cartApiBase()
    ? fetch("/api/delivery/fetchAddresses",
        { credentials: "include", headers: { "X-Phone-Platform": "web" } })
        .then(function (r) { return r.status === 200; })
        .catch(function () { return null; })
    : Promise.resolve(false);

  function seedGuestCart() {
    var items = Object.keys(cart).map(function (sku) {
      return { productId: String(sku), productName: cart[sku].name || "", quantity: cart[sku].qty };
    });
    var n = items.reduce(function (t, i) { return t + Number(i.quantity || 0); }, 0);
    var outer = {};
    try { outer = JSON.parse(localStorage.getItem(PERSIST_CART)) || {}; } catch (e) {}

    // merge with anything already in the guest cart rather than clobbering it
    var existing = [];
    try {
      existing = typeof outer.localCart === "string" ? JSON.parse(outer.localCart)
               : (outer.localCart || []);
    } catch (e) {}
    if (Array.isArray(existing) && existing.length) {
      var byId = {};
      existing.forEach(function (i) { byId[String(i.productId)] = i; });
      items.forEach(function (i) { byId[String(i.productId)] = i; });
      items = Object.keys(byId).map(function (k) { return byId[k]; });
      n = items.reduce(function (t, i) { return t + Number(i.quantity || 0); }, 0);
    }

    outer.localCart = JSON.stringify(items);
    outer.localCartCount = JSON.stringify(n);
    outer.cartItemsCount = JSON.stringify(n);
    localStorage.setItem(PERSIST_CART, JSON.stringify(outer));
    return n;
  }

  function goToCart() {
    var cfg = window.PE_CONFIG || {};
    location.href = cfg.cartUrl || "/cart";
  }

  /* Proceed: signed in -> push to the real cart API, guest -> seed the store.
     Either way the destination shows the items. */
  function handoffToCart() {
    if (!cartApiBase()) { goToCart(); return; }        // off-origin preview
    return LOGIN_CHECK.then(function (loggedIn) {
      if (loggedIn === true) return flushPending().then(goToCart);
      try { seedGuestCart(); } catch (e) {}
      goToCart();
    });
  }

  function wireCartLinks() {
    $$("[data-cart-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if ($("#cart-drawer")) { e.preventDefault(); drawerOpen(true); }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Cart drawer – clicking Cart opens an editable basket rather than
     jumping straight to pharmeasy.in/cart. Proceed still does the
     flush-then-hand-off described above.
     --------------------------------------------------------------------- */
  var rupee = function (n) {
    return "\u20b9" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
  };

  function drawerOpen(on) {
    var d = $("#cart-drawer"), sc = $(".scrim");
    if (!d) return;
    d.hidden = !on;
    if (sc) sc.classList.toggle("on", on);
    document.body.style.overflow = on ? "hidden" : "";
    if (on) drawerRender();
  }

  function drawerRender() {
    var list = $("[data-cd-list]");
    if (!list) return;
    var skus = Object.keys(cart);
    var total = skus.reduce(function (t, k) {
      return t + (parseFloat(cart[k].price) || 0) * cart[k].qty;
    }, 0);

    $$("[data-cd-count]").forEach(function (e) { e.textContent = "(" + cartTotalItems() + ")"; });
    $$("[data-cd-total]").forEach(function (e) { e.textContent = rupee(total); });

    if (!skus.length) {
      list.innerHTML = '<p class="cd-empty">Your cart is empty. Add a medicine to get started.</p>';
      return;
    }
    var full = cartTotalItems() >= CART_MAX;
    list.innerHTML = skus.map(function (k) {
      var i = cart[k];
      return '<div class="cd-row" data-cd-sku="' + k + '">' +
        '<div class="cd-info"><a href="' + (i.href || "#") + '">' + i.name + '</a>' +
        '<span>' + (i.pack || "") + '</span>' +
        '<b>' + rupee((parseFloat(i.price) || 0) * i.qty) + '</b></div>' +
        '<div class="cd-qty">' +
          '<button type="button" data-cd-d="-1" aria-label="Remove one">\u2212</button>' +
          '<span>' + i.qty + '</span>' +
          '<button type="button" data-cd-d="1"' + (full ? " disabled" : "") + ' aria-label="Add one">+</button>' +
        '</div>' +
        '<button type="button" class="cd-del" data-cd-del aria-label="Remove ' + i.name + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>' +
      '</div>';
    }).join("");
  }

  /* edits made inside the drawer write straight to the same cart object */
  function drawerEdit(sku, delta) {
    var card = $('.med[data-sku="' + sku + '"]');
    if (card) { cartAdd(card, delta); }
    else {
      var q = cartQty(sku) + delta;
      if (delta > 0 && cartTotalItems() + delta > CART_MAX) { drawerRender(); return; }
      if (q <= 0) delete cart[sku]; else cart[sku].qty = q;
      cartSave();
    }
    drawerRender();
  }

  function wireDrawer() {
    var d = $("#cart-drawer");
    if (!d) return;
    $$("[data-cd-close]").forEach(function (b) { b.addEventListener("click", function () { drawerOpen(false); }); });
    var sc = $(".scrim");
    if (sc) sc.addEventListener("click", function () { drawerOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") drawerOpen(false); });

    d.addEventListener("click", function (e) {
      var row = e.target.closest("[data-cd-sku]");
      if (!row) return;
      var sku = row.dataset.cdSku;
      if (e.target.closest("[data-cd-del]")) { drawerEdit(sku, -cartQty(sku)); return; }
      var step = e.target.closest("[data-cd-d]");
      if (step && !step.disabled) drawerEdit(sku, Number(step.dataset.cdD));
    });

    var go = $("[data-cd-go]");
    if (go) go.addEventListener("click", function () {
      go.disabled = true;
      go.textContent = "Opening cart…";
      Promise.resolve(handoffToCart());
    });
  }

  /* mobile hamburger -> the same primary nav links as the header */
  (function () {
    var btn = $("[data-menu-btn]");
    var menu = $("#m-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      menu.hidden = open;
    });
  })();

  cartPaintCount();
  wireCartLinks();
  wireDrawer();

  /* The sticky Sort|Filter bar only earns its space once the user is actually
     among the products — reveal it when the first card's Add button scrolls
     into view, and hide it again above that. */
  (function () {
    var bar = $(".mtools"), firstCta = $(".med .btn-add") || $(".med");
    if (!bar || !firstCta || !("IntersectionObserver" in window)) return;
    bar.classList.add("is-armed");
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        bar.classList.toggle("on", e.isIntersecting || e.boundingClientRect.top < 0);
      });
    }, { rootMargin: "0px 0px -40% 0px" }).observe(firstCta);
  })();
  paintSyncNote();
  // arriving back with a session (e.g. straight after login) drains the queue
  if (pending().length) flushPending();

  /* =======================================================================
     Shared: FAQ accordion
     ======================================================================= */
  $$(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.hidden = open;
    });
  });

  /* =======================================================================
     Shared: footer accordion – mobile only
     ======================================================================= */
  var footToggles = $$(".ft-toggle");
  function syncFooter() {
    var mobile = mqMobile.matches;
    footToggles.forEach(function (btn, i) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!mobile) {
        btn.setAttribute("aria-expanded", "true");
        btn.setAttribute("tabindex", "-1");
        if (panel) panel.hidden = false;
      } else {
        btn.removeAttribute("tabindex");
        // live footer starts fully collapsed on mobile
        btn.setAttribute("aria-expanded", "false");
        if (panel) panel.hidden = true;
      }
    });
  }
  footToggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!mqMobile.matches) return;
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.hidden = open;
    });
  });

  /* =======================================================================
     Shared: sticky mobile header + back to top
     ======================================================================= */
  /* The header is position:sticky on <header>, so it needs no placeholder --
     an earlier version was position:fixed and injected a spacer div to
     reserve its height. That spacer is now just a 64px gap, so it is gone.
     All this does is flag the scrolled state for the shadow. */
  var siteHdr = $("header"), toTop = $(".totop");
  function onScroll() {
    var y = window.pageYOffset;
    if (siteHdr) siteHdr.classList.toggle("is-float", y > 8);
    if (toTop) toTop.classList.toggle("on", y > 800);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: mqMobile.matches ? "auto" : "smooth" });
  });

  /* =======================================================================
     DIRECTORY PAGE
     ======================================================================= */
  var dir = $("[data-directory]");
  if (dir) (function () {
    var input   = $("#class-search");
    var clear   = $("#class-search-clear");
    var azBtns  = $$(".az button");
    var groups  = $$(".grp");
    var items   = $$(".grp-list li");
    var popular = $("[data-popular]");
    var empty   = $("[data-empty]");
    var count   = $("[data-count]");
    var total   = items.length;

    var state = { q: params.get("q") || "", letter: (params.get("letter") || "").toUpperCase() };
    if (input) input.value = state.q;

    var bm = $("[data-bestmatch]");

    /* A condition word like "fever" is not in any class name, so plain
       substring matching finds nothing. Score each class on its conditions
       list too, and surface the strongest one as a direct link. */
    function bestMatch(q) {
      if (!q || q.length < 3) return null;
      var best = null;
      items.forEach(function (li) {
        var terms = (li.dataset.conditions || "").split("|").filter(Boolean);
        var name = (li.dataset.name || "").toLowerCase();
        var score = 0;
        if (name === q) score = 100;
        else if (name.indexOf(q) === 0) score = 60;
        terms.forEach(function (t) {
          if (t === q) score = Math.max(score, 90);
          else if (t.indexOf(q) === 0) score = Math.max(score, 70);
          else if (t.indexOf(q) !== -1 || q.indexOf(t) !== -1) score = Math.max(score, 40);
        });
        if (score && (!best || score > best.score)) best = { li: li, score: score };
      });
      return best && best.score >= 40 ? best.li : null;
    }

    function apply() {
      var q = state.q.trim().toLowerCase();
      var shown = 0;

      items.forEach(function (li) {
        var hay = li.dataset.search || "";
        var ok = (!q || hay.indexOf(q) !== -1) &&
                 (!state.letter || li.dataset.letter === state.letter);
        li.hidden = !ok;
        if (ok) shown++;
      });

      if (bm) {
        var hit = state.letter ? null : bestMatch(q);
        if (hit) {
          bm.href = hit.querySelector("a").getAttribute("href");
          bm.querySelector("[data-bm-term]").textContent = '"' + state.q.trim() + '"';
          bm.querySelector("[data-bm-name]").textContent = hit.dataset.name;
          bm.querySelector("[data-bm-count]").textContent =
            hit.querySelector(".n").textContent + " medicines";
        }
        bm.hidden = !hit;
      }

      groups.forEach(function (g) {
        var vis = $$("li", g).filter(function (li) { return !li.hidden; }).length;
        g.hidden = vis === 0;
        var c = $(".grp-count", g);
        if (c) c.textContent = vis + (vis === 1 ? " class" : " classes");
      });

      var filtering = !!q || !!state.letter;
      if (popular) popular.hidden = filtering;
      if (empty) empty.hidden = shown !== 0;
      var dirCard = $(".dir-card .groups");
      if (dirCard) dirCard.hidden = shown === 0;
      if (count) count.textContent = shown + " of " + total + " classes";
      if (clear) clear.hidden = !state.q;

      azBtns.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.letter === state.letter));
      });

      setParams({ q: state.q || "", letter: state.letter || "" });
      syncGroups();
    }

    // letter groups: accordion under 768px (first two open), static above
    function syncGroups() {
      var mobile = mqMobile.matches;
      var visible = groups.filter(function (g) { return !g.hidden; });
      visible.forEach(function (g, i) {
        var btn = $(".grp-btn", g);
        var list = $(".grp-list", g);
        if (!btn || !list) return;
        if (!mobile) {
          btn.setAttribute("aria-expanded", "true");
          btn.setAttribute("tabindex", "-1");
          btn.setAttribute("aria-disabled", "true");
          list.hidden = false;
        } else {
          btn.removeAttribute("tabindex");
          btn.removeAttribute("aria-disabled");
          if (g.dataset.touched !== "1") {
            var open = i < 2;
            btn.setAttribute("aria-expanded", String(open));
            list.hidden = !open;
          }
        }
      });
    }

    $$(".grp-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!mqMobile.matches) return;
        var g = btn.closest(".grp");
        g.dataset.touched = "1";
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        $(".grp-list", g).hidden = open;
      });
    });

    if (input) input.addEventListener("input", debounce(function () {
      state.q = input.value; apply();
    }, 150));
    if (clear) clear.addEventListener("click", function () {
      state.q = ""; if (input) { input.value = ""; input.focus(); } apply();
    });
    azBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        state.letter = state.letter === b.dataset.letter ? "" : b.dataset.letter;
        apply();
      });
    });
    var reset = $("[data-reset]");
    if (reset) reset.addEventListener("click", function () {
      state.q = ""; state.letter = "";
      if (input) input.value = "";
      apply();
      if (input) input.focus();
    });

    var popMore = $(".pop-more");
    if (popMore) popMore.addEventListener("click", function () {
      $(".pop-grid").classList.add("is-open");
    });

    mqMobile.addEventListener("change", function () { syncGroups(); syncFooter(); });
    apply();
  })();

  /* =======================================================================
     CLASS PAGE
     ======================================================================= */
  var cls = $("[data-class-page]");
  if (cls) (function () {
    var cards   = $$(".med");
    var grid    = $(".med-grid");
    var sortSel = $("#sort");
    var count   = $("[data-med-count]");
    var chips   = $$(".chip");
    var subBoxes  = $$("[data-sub-filter]");
    var formPills = $$(".form-pill");
    var availBoxes = $$("[data-avail-filter]");
    var totalCatalogue = grid ? grid.dataset.total : cards.length;

    var pageSize = parseInt(grid && grid.dataset.pageSize, 10) || 24;
    var shown = pageSize;
    var moreBtn = $("[data-show-more]");
    var shownNote = $("[data-shown-note]");
    var uniq = function (a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); };

    var state = {
      subs: uniq((params.get("sub") || "").split(",").filter(Boolean)),
      forms: uniq((params.get("form") || "").split(",").filter(Boolean)),
      sort: params.get("sort") || "relevance",
      stock: params.get("stock") === "1",
      subst: params.get("subst") === "1"
    };
    if (sortSel) sortSel.value = state.sort;

    function matches(card) {
      if (card.dataset.drop === "1") return false;   // "we do not sell this"
      if (state.subs.length && state.subs.indexOf(card.dataset.sub) === -1) return false;
      if (state.forms.length && state.forms.indexOf(card.dataset.form) === -1) return false;
      if (state.stock && card.dataset.avail !== "in") return false;
      if (state.subst && card.dataset.subst !== "1") return false;
      return true;
    }

    function apply(resetShown) {
      if (resetShown !== false) shown = pageSize;

      // 1. which cards pass the filters
      var vis = cards.filter(matches);

      // 2. order them
      var key = state.sort;
      if (key !== "relevance") {
        vis.sort(function (a, b) {
          var pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
          if (!isFinite(pa)) pa = Infinity;
          if (!isFinite(pb)) pb = Infinity;
          if (key === "price-asc")  return pa - pb;
          if (key === "price-desc") return pb - pa;
          if (key === "discount")
            return (parseFloat(b.dataset.off) || 0) - (parseFloat(a.dataset.off) || 0);
          return 0;
        });
      } else {
        vis.sort(function (a, b) { return (+a.dataset.rank) - (+b.dataset.rank); });
      }

      // 3. reveal only the first `shown` of them
      var live = vis.slice(0, shown);
      cards.forEach(function (c) { c.hidden = true; });
      live.forEach(function (c, i) { c.hidden = false; c.style.order = i; });

      if (moreBtn) {
        var left = vis.length - live.length;
        moreBtn.parentNode.hidden = left <= 0;
        moreBtn.textContent = "Show next " + Math.min(pageSize, left) + " medicines";
        if (shownNote) shownNote.textContent = "Showing " + live.length + " of " + vis.length;
      }
      if (count) count.textContent = vis.length + " of " + totalCatalogue + " medicines";
      hydrateVisible();

      chips.forEach(function (ch) {
        var v = ch.dataset.sub;
        ch.setAttribute("aria-pressed", String(v === "" ? state.subs.length === 0
                                                        : state.subs.length === 1 && state.subs[0] === v));
      });
      subBoxes.forEach(function (b) { b.checked = state.subs.indexOf(b.value) !== -1; });
      formPills.forEach(function (p) {
        p.setAttribute("aria-pressed", String(state.forms.indexOf(p.dataset.form) !== -1));
      });
      availBoxes.forEach(function (b) {
        b.checked = b.dataset.availFilter === "stock" ? state.stock : state.subst;
      });
      var mf = $("[data-filter-btn]");
      if (mf) mf.classList.toggle("has-filters",
        state.subs.length + state.forms.length > 0 || state.stock || state.subst);

      setParams({
        sub: state.subs.join(",") || "",
        form: state.forms.join(",") || "",
        sort: state.sort === "relevance" ? "" : state.sort,
        stock: state.stock ? "1" : "",
        subst: state.subst ? "1" : ""
      });
    }

    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        var v = ch.dataset.sub;
        state.subs = v === "" ? [] : [v];
        apply();
      });
    });
    // the sidebar and the mobile filter sheet each render the same checkboxes,
    // so collect values through uniq() or the state array doubles up
    subBoxes.forEach(function (b) {
      b.addEventListener("change", function () {
        state.subs = uniq(subBoxes.filter(function (x) { return x.checked; })
                                  .map(function (x) { return x.value; }));
        apply();
      });
    });
    if (moreBtn) moreBtn.addEventListener("click", function () {
      shown += pageSize;
      apply(false);
    });
    formPills.forEach(function (p) {
      p.addEventListener("click", function () {
        if (p.disabled) return;
        var f = p.dataset.form, i = state.forms.indexOf(f);
        if (i === -1) state.forms.push(f); else state.forms.splice(i, 1);
        apply();
      });
    });
    availBoxes.forEach(function (b) {
      b.addEventListener("change", function () {
        if (b.dataset.availFilter === "stock") state.stock = b.checked;
        else state.subst = b.checked;
        apply();
      });
    });
    if (sortSel) sortSel.addEventListener("change", function () {
      state.sort = sortSel.value; apply();
    });
    var clearAll = $("[data-clear-filters]");
    if (clearAll) clearAll.addEventListener("click", function () {
      state.subs = []; state.forms = []; state.stock = false; state.subst = false;
      apply();
    });

    /* ---- mobile bottom sheets ------------------------------------------- */
    var scrim = $(".scrim");
    function openSheet(el) {
      if (!el) return;
      el.classList.add("on");
      if (scrim) scrim.classList.add("on");
      document.body.style.overflow = "hidden";
    }
    function closeSheets() {
      $$(".sheet").forEach(function (s) { s.classList.remove("on"); });
      if (scrim) scrim.classList.remove("on");
      document.body.style.overflow = "";
    }
    if (scrim) scrim.addEventListener("click", closeSheets);
    $$("[data-sheet-close]").forEach(function (b) { b.addEventListener("click", closeSheets); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheets(); });
    var sortBtn = $("[data-sort-btn]"), filterBtn = $("[data-filter-btn]");
    if (sortBtn) sortBtn.addEventListener("click", function () { openSheet($("#sheet-sort")); });
    if (filterBtn) filterBtn.addEventListener("click", function () { openSheet($("#sheet-filter")); });
    $$(".sheet-opt[data-sort-value]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.sort = b.dataset.sortValue;
        if (sortSel) sortSel.value = state.sort;
        $$(".sheet-opt[data-sort-value]").forEach(function (x) {
          x.setAttribute("aria-checked", String(x === b));
        });
        apply(); closeSheets();
      });
    });

    var hydrate = makeHydrator(function () { apply(false); });
    function hydrateVisible() {
      var live = cards.filter(function (c) { return !c.hidden; });
      live.forEach(paintAddControl);
      hydrate(live);
    }

    // wire the Add buttons that shipped in the HTML
    cards.forEach(function (c) {
      var b = $(".btn-add", c);
      if (b) b.addEventListener("click", function () { if (!b.disabled) cartAdd(c, 1); });
    });

    apply();
  })();

  /* =======================================================================
     LIVE PRICING
     The endpoint is per-product, so requests run through a small pool rather
     than firing one per card at once. Cards already carry a build-time
     snapshot, so a failure here leaves the last known price on screen
     rather than blanking the grid.
     ======================================================================= */
  function makeHydrator(done) {
    var cfg = window.PE_CONFIG || {};
    var rupee = function (n) {
      return "₹" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
    };
    var queue = [], active = 0, MAX = 6, changed = false, settle = null;

    function enqueue(cards) {
      if (!cfg.priceApi) return;
      cards.forEach(function (c) {
        if (c.dataset.hydrated) return;
        c.dataset.hydrated = "queued";
        c.classList.add("is-loading");
        queue.push(c);
      });
      next();
    }

    function next() {
      if (!queue.length) {
        if (!active && changed) {
          changed = false;
          // re-run once the batch settles so price sorts see real numbers
          clearTimeout(settle);
          settle = setTimeout(function () { if (done) done(); }, 60);
        }
        return;
      }
      if (active >= MAX) return;
      var card = queue.shift();
      active++;
      var url = cfg.priceApi.replace("{id}", encodeURIComponent(card.dataset.sku));

      fetch(url, { headers: { accept: "application/json" }, credentials: "omit" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { paint(card, d); changed = true; })
        .catch(function () {
          // CORS or network failure -- keep the build-time snapshot on screen
          card.classList.remove("is-loading");
        })
        .then(function () { card.dataset.hydrated = "1"; active--; next(); });

      next();
    }

    function paint(card, d) {
      card.classList.remove("is-loading");
      var mrp  = parseFloat(d.costPrice);
      var apiSale = parseFloat(d.salePrice);
      // ADDITIVE on the API's discountPercent, off MRP -- identical to the
      // build, so hydration never changes the number on screen.
      var extra = Number(cfg.extraOffPct) || 0;
      var pct = parseFloat(d.discountPercent);
      if (!isFinite(pct) && isFinite(mrp) && isFinite(apiSale) && mrp > 0)
        pct = (1 - apiSale / mrp) * 100;
      var offPct = Math.min(95, Math.round(pct + extra));
      var sale = (isFinite(mrp) && mrp > 0 && isFinite(offPct)) ? mrp * (1 - offPct / 100) : NaN;
      var avail = d.isAvailable === true;

      var priceEl = $(".price", card), mrpEl = $(".mrp", card),
          saveEl  = $(".save", card),  offEl = $(".badge-off", card),
          addBtn  = $(".btn-add", card);

      if (isFinite(sale) && sale > 0) {
        priceEl.textContent = rupee(sale);
        card.dataset.price = String(sale);
        if (isFinite(mrp) && mrp > sale) {
          mrpEl.textContent = rupee(mrp);
          mrpEl.hidden = false;
          var off = offPct;
          card.dataset.off = String(off);
          if (off > 0) { offEl.textContent = off + "% OFF"; offEl.classList.add("on"); }
          saveEl.textContent = "You save " + rupee(mrp - sale);
        } else {
          mrpEl.hidden = true; saveEl.textContent = ""; offEl.classList.remove("on");
          card.dataset.off = "0";
        }
      } else {
        priceEl.textContent = "Price unavailable";
        mrpEl.hidden = true; saveEl.textContent = ""; offEl.classList.remove("on");
      }

      /* productTierAttributes gives the exact reason, so the card can say
         what is actually true rather than a catch-all "unavailable":
           type 5 -> live      type 2 -> out of stock / discontinued
           type 1 -> "We do not sell this product"                        */
      var tier = d.productTierAttributes || {};
      var text = String(tier.text || "");
      var notSold = tier.type === 1;
      var discontinued = /discontinu/i.test(text);
      var notify = !!((d.productAvailabilityFlags || {}).notifyMe);

      card.dataset.state = text;
      card.dataset.avail = notSold ? "notsold"
                         : discontinued ? "discontinued"
                         : avail ? "in" : "out";

      // a product PharmEasy does not sell should not sit in the grid at all
      if (notSold) { card.dataset.drop = "1"; card.hidden = true; }

      var sub = d.productSubstitutionAttributes;
      if (sub && sub.count > 0) card.dataset.subst = "1";

      if (addBtn) {
        addBtn.disabled = !avail;
        addBtn.textContent = notSold ? "Not available"
          : discontinued ? "Discontinued"
          : avail ? "Add"
          : (notify ? "Notify me" : "Out of stock");
      }
    }

    return enqueue;
  }

  syncFooter();
  onScroll();
  mqMobile.addEventListener("change", syncFooter);
})();
