/* ============================================================
   OVERBRØD — app.js
   Vanilla JS. No build step, no dependencies.

   NOTE ON PERSISTENCE & SECURITY (read me):
   This is a static site with no backend, so reservations and
   menu edits are stored in the browser's localStorage. Data is
   per-device/per-browser, and the staff password below is
   verified client-side — it is NOT real security. For live
   bookings shared across staff and a private admin, this needs
   a small backend (API + database + real auth). The UI is built
   so that swap is straightforward.
   ============================================================ */
(function () {
  "use strict";

  var STAFF_PASSWORD = "OVERBRODSG";
  var MENU_KEY = "overbrod.menu.v1";
  var BOOKINGS_KEY = "overbrod.bookings.v1";
  // PDPA data-minimisation: a booking is kept only until N days *after the
  // reservation date it was for*, not N days after it was submitted.
  var RETENTION_DAYS = 7;
  // Image/media URLs accepted by the menu editor and CMS (defense-in-depth
  // against javascript:/other schemes being stored and rendered) — mirrors
  // the server's SAFE_MEDIA_SRC in overbrod-server/src/validate.js.
  var SAFE_IMG = /^(https?:\/\/|data:image\/|\/uploads\/)/i;
  var CONTENT_KEY = "overbrod.content.v1";
  var MEDIA_KEY = "overbrod.media.v1";

  /* ============================================================
     API LAYER
     When served by the backend (overbrod-server), the page talks to a
     real API over same-origin cookies. Opened as a static file, or on a
     host without the API, it falls back to the localStorage demo below.
     ============================================================ */
  var API = "/api";
  var apiMode = false;
  function apiReq(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: body ? { "content-type": "application/json" } : undefined,
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var e = new Error(data.error || ("HTTP " + r.status)); e.status = r.status; e.data = data; throw e; }
        return data;
      });
    });
  }
  function detectApi() {
    if (location.protocol !== "http:" && location.protocol !== "https:") return Promise.resolve(false);
    return fetch(API + "/health", { credentials: "same-origin" })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }
  function loadMenu() {
    if (!apiMode) return Promise.resolve();
    return apiReq("GET", "/menu").then(function (d) { menu = d.menu || []; });
  }
  function loadBookings() {
    if (!apiMode) return Promise.resolve();
    return apiReq("GET", "/staff/bookings").then(function (d) { bookings = d.bookings || []; });
  }
  function loadContent() {
    if (!apiMode) return Promise.resolve();
    return apiReq("GET", "/content").then(function (d) { contentOverrides = d.entries || {}; });
  }
  function loadMediaLibrary() {
    if (!apiMode) return Promise.resolve();
    return apiReq("GET", "/staff/media").then(function (d) { mediaLibrary = d.media || []; });
  }
  function apiErr(err) { toast("Something went wrong", (err && err.message) || "Please try again.", "error"); }

  var CATEGORIES = [
    "Smørrebrød",
    "Hot Mains & Platters",
    "Sides",
    "Pastries & Desserts",
    "Beverages",
  ];
  var DIETARY = ["Vegan", "Halal-friendly", "Nut-free", "Gluten-free"];

  /* ---------- seed menu (from OVERBRØD business data) ---------- */
  var SEED_MENU = [
    { name: "Mushroom", price: 15, category: "Smørrebrød", description: "Roasted and pickled mushrooms on dark rye with fresh herbs — earthy, meat-free and surprisingly full.", signature: false, diet: ["Nut-free"], available: true },
    { name: "Roast Beef", price: 18, category: "Smørrebrød", description: "Thin-sliced roast beef with remoulade and crisp fried onions on buttered rye.", signature: false, diet: ["Nut-free"], available: true },
    { name: "Toast Skagen / Shrimp V2.0", price: 19, category: "Smørrebrød", description: "Cold-water shrimp in a dill-and-lemon mayo, piled on toasted bread — our take on the Swedish classic.", signature: false, diet: ["Nut-free"], available: true },
    { name: "Gravadlax / Cured Salmon", price: 19, category: "Smørrebrød", description: "House-cured salmon with mustard-dill sauce; silky, bright and delicate.", signature: true, diet: ["Nut-free"], available: true },
    { name: "The Shooting Star / Stjerneskud", price: 26, category: "Smørrebrød", description: "Thick fried halibut, poached shrimp, asparagus and mustard sauce — the plate everyone talks about.", signature: true, diet: ["Nut-free"], available: true },

    { name: "Leverpostej / Danish Liver Pâté", price: 12, category: "Hot Mains & Platters", description: "Warm Danish liver pâté with pickles and crisp bacon on rye.", signature: false, diet: ["Nut-free"], available: true },
    { name: "Frikadeller / Meatballs", price: 18, category: "Hot Mains & Platters", description: "Pan-fried Danish pork-and-veal meatballs with gravy and lingonberry.", signature: true, diet: ["Nut-free"], available: true },
    { name: "Fisksoppa / Swedish Fish Stew", price: 24, category: "Hot Mains & Platters", description: "Creamy Swedish fish stew with potatoes, fish and prawns, served with toasted bread.", signature: true, diet: ["Nut-free"], available: true },

    { name: "Soup or Salad of the Day", price: 4, category: "Sides", description: "Ask us what we've made today. Add to any main.", signature: false, diet: [], available: true, addOn: true },

    { name: "Kanelbullar / Cinnamon Knot Bun", price: 7, category: "Pastries & Desserts", description: "Cardamom-scented cinnamon knot, baked in-house.", signature: false, diet: [], available: true },
    { name: "Ben and Berry Tart", price: 7, category: "Pastries & Desserts", description: "Buttery tart with seasonal berries.", signature: false, diet: ["Nut-free"], available: true },
    { name: "Chocolate Tart", price: 10, category: "Pastries & Desserts", description: "Dark chocolate ganache tart with a crisp shell.", signature: false, diet: ["Nut-free"], available: true },

    { name: "Hot Black Coffee / Seasonal Batch Brew", price: 5, category: "Beverages", description: "Seasonal single-origin batch brew, served hot.", signature: false, diet: ["Vegan", "Gluten-free", "Nut-free"], available: true },
    { name: "Ice Black Coffee / Cold Brew", price: 6, category: "Beverages", description: "Slow-steeped cold brew over ice.", signature: false, diet: ["Vegan", "Gluten-free", "Nut-free"], available: true },
    { name: "Cold Brew White", price: 7, category: "Beverages", description: "Cold brew lengthened with milk.", signature: false, diet: ["Gluten-free", "Nut-free"], available: true },
    { name: "Pink Gingerlily Tea", price: 7, category: "Beverages", description: "House-blended ginger-and-lily iced tea.", signature: false, diet: ["Vegan", "Gluten-free", "Nut-free"], available: true },
    { name: "Ice Elderflower Tea / House Soda", price: 7, category: "Beverages", description: "Elderflower house soda, lightly sparkling.", signature: false, diet: ["Vegan", "Gluten-free", "Nut-free"], available: true },
  ];

  /* ---------- tiny helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  // Tint genuine Danish/Nordic letters (ø, å, æ) the same accent as the
  // logo's Ø — call only on text already run through esc().
  function nordicMark(escaped) { return escaped.replace(/([øÅåÆæØ])/g, '<span class="o-slash">$1</span>'); }
  function money(n) { return "$" + (Math.round(Number(n) * 100) / 100).toFixed(Number(n) % 1 === 0 ? 0 : 2); }

  /* ============================================================
     CONTENT (CMS) FIELDS
     Every editable text/image/video on the public site, in one config.
     Drives three things: what data-cms-key the public markup carries
     (see index.html), what fields render in the staff Content tab, and
     how a saved value gets applied back onto the live page.
     ============================================================ */
  function field(key, label, group, opts) {
    opts = opts || {};
    var selector = opts.selector || ('[data-cms-key="' + key + '"]');
    return {
      key: key, label: label, group: group, input: opts.input || "text",
      apply: function (v) {
        if (!v) return;
        $$(selector).forEach(function (el) {
          if (opts.attr) { el.setAttribute(opts.attr, v); return; }
          if (opts.prop) { el[opts.prop] = v; return; }
          if (opts.href) {
            el.setAttribute("href", opts.href(v));
            el.innerHTML = nordicMark(esc(v));
            return;
          }
          var html = nordicMark(esc(v));
          if (opts.multiline) html = html.replace(/\n/g, "<br>");
          el.innerHTML = html;
        });
      },
    };
  }
  var CONTENT_FIELDS = [
    field("hero.eyebrow", "Eyebrow", "Hero"),
    field("hero.tagline", "Tagline", "Hero", { input: "textarea", multiline: true }),
    field("hero.note", "Note (under the buttons)", "Hero"),
    // The hero film itself is intentionally NOT editable/removable from the
    // CMS — it's the brand centrepiece, so its sources stay hardcoded in
    // index.html (data-mp4/data-webm on .hero__video). The still poster
    // shown before it plays / on mobile stays editable.
    field("hero.poster", "Poster image (shown before the video plays / on mobile)", "Hero", { input: "image", selector: '[data-cms-key="hero.video"]', prop: "poster" }),

    field("brand.logo", "Logo mark (nav + footer)", "Brand", { input: "image", prop: "src" }),

    field("story.eyebrow", "Eyebrow", "Story"),
    field("story.title", "Title", "Story"),
    field("story.lede", "Body copy", "Story", { input: "textarea", multiline: true }),
    field("story.photo", "Photo", "Story", { input: "image", prop: "src" }),
    field("story.craft.1", "Technique 1 (Curing)", "Story"),
    field("story.craft.2", "Technique 2 (Smoking)", "Story"),
    field("story.craft.3", "Technique 3 (Pickling)", "Story"),

    field("dishes.eyebrow", "Eyebrow", "Signature dishes"),
    field("dish.0.name", "Dish 1 — name (Roast Beef)", "Signature dishes"),
    field("dish.0.eyebrow", "Dish 1 — card label (\"Smørrebrød\"/\"Signature · Smørrebrød\")", "Signature dishes"),
    field("dish.0.desc", "Dish 1 — description", "Signature dishes", { input: "textarea", multiline: true }),
    field("dish.0.tag", "Dish 1 — allergen tag (\"Nut-free\")", "Signature dishes"),
    field("dish.0.ghost", "Dish 1 — large background word", "Signature dishes"),
    field("dish.0.image", "Dish 1 — photo", "Signature dishes", { input: "image", prop: "src" }),
    field("dish.1.name", "Dish 2 — name (Salmon)", "Signature dishes"),
    field("dish.1.eyebrow", "Dish 2 — card label (\"Smørrebrød\"/\"Signature · Smørrebrød\")", "Signature dishes"),
    field("dish.1.desc", "Dish 2 — description", "Signature dishes", { input: "textarea", multiline: true }),
    field("dish.1.tag", "Dish 2 — allergen tag (\"Nut-free\")", "Signature dishes"),
    field("dish.1.ghost", "Dish 2 — large background word", "Signature dishes"),
    field("dish.1.image", "Dish 2 — photo", "Signature dishes", { input: "image", prop: "src" }),
    field("dish.2.name", "Dish 3 — name (Shrimp Skagen)", "Signature dishes"),
    field("dish.2.eyebrow", "Dish 3 — card label (\"Smørrebrød\"/\"Signature · Smørrebrød\")", "Signature dishes"),
    field("dish.2.desc", "Dish 3 — description", "Signature dishes", { input: "textarea", multiline: true }),
    field("dish.2.tag", "Dish 3 — allergen tag (\"Nut-free\")", "Signature dishes"),
    field("dish.2.ghost", "Dish 3 — large background word", "Signature dishes"),
    field("dish.2.image", "Dish 3 — photo", "Signature dishes", { input: "image", prop: "src" }),
    field("dish.3.name", "Dish 4 — name (Shooting Star)", "Signature dishes"),
    field("dish.3.eyebrow", "Dish 4 — card label (\"Smørrebrød\"/\"Signature · Smørrebrød\")", "Signature dishes"),
    field("dish.3.desc", "Dish 4 — description", "Signature dishes", { input: "textarea", multiline: true }),
    field("dish.3.tag", "Dish 4 — allergen tag (\"Nut-free\")", "Signature dishes"),
    field("dish.3.ghost", "Dish 4 — large background word", "Signature dishes"),
    field("dish.3.image", "Dish 4 — photo", "Signature dishes", { input: "image", prop: "src" }),

    field("instagram.eyebrow", "Eyebrow", "Instagram"),
    field("instagram.title", "Title", "Instagram"),
    field("instagram.handle", "Handle", "Instagram"),
    field("insta.photo1", "Photo 1", "Instagram", { input: "image", prop: "src" }),
    field("insta.photo2", "Photo 2", "Instagram", { input: "image", prop: "src" }),
    field("insta.photo3", "Photo 3", "Instagram", { input: "image", prop: "src" }),
    field("insta.photo4", "Photo 4", "Instagram", { input: "image", prop: "src" }),
    field("insta.video1.mp4", "Video 1 — MP4", "Instagram", { input: "video", selector: '[data-cms-key="insta.video1"]', attr: "data-mp4" }),
    field("insta.video1.poster", "Video 1 — poster image", "Instagram", { input: "image", prop: "src" }),
    field("insta.video2.mp4", "Video 2 — MP4", "Instagram", { input: "video", selector: '[data-cms-key="insta.video2"]', attr: "data-mp4" }),
    field("insta.video2.poster", "Video 2 — poster image", "Instagram", { input: "image", prop: "src" }),

    field("menu.eyebrow", "Eyebrow", "Menu section"),
    field("menu.title", "Title", "Menu section"),
    field("menu.intro", "Intro copy", "Menu section", { input: "textarea", multiline: true }),

    field("reviews.eyebrow", "Eyebrow", "Reviews"),
    field("reviews.title", "Title", "Reviews"),
    field("reviews.0.quote", "Review 1 — quote", "Reviews", { input: "textarea", multiline: true }),
    field("reviews.0.author", "Review 1 — author", "Reviews"),
    field("reviews.1.quote", "Review 2 — quote", "Reviews", { input: "textarea", multiline: true }),
    field("reviews.1.author", "Review 2 — author", "Reviews"),
    field("reviews.2.quote", "Review 3 — quote", "Reviews", { input: "textarea", multiline: true }),
    field("reviews.2.author", "Review 3 — author", "Reviews"),

    field("reserve.eyebrow", "Eyebrow", "Reservations"),
    field("reserve.title", "Title", "Reservations"),
    field("reserve.intro", "Intro copy", "Reservations", { input: "textarea", multiline: true }),
    field("reserve.hours.lunch.label", "Lunch — label", "Reservations"),
    field("reserve.hours.lunch", "Lunch — hours", "Reservations"),
    field("reserve.hours.dinner.label", "Dinner — label", "Reservations"),
    field("reserve.hours.dinner", "Dinner — hours", "Reservations"),
    field("reserve.hours.weekend.label", "Weekends — label", "Reservations"),
    field("reserve.hours.weekend", "Weekends — hours", "Reservations"),

    field("visit.eyebrow", "Eyebrow", "Find us"),
    field("visit.title", "Title", "Find us"),
    field("visit.hours.weekday", "Weekday hours", "Find us"),
    field("visit.hours.weekend", "Weekend hours", "Find us"),
    field("visit.address", "Address", "Find us", { input: "textarea", multiline: true }),
    field("visit.transit.mrt", "MRT directions", "Find us"),
    field("visit.transit.parking", "Parking", "Find us"),
    field("visit.phone", "Phone", "Find us", { href: function (v) { return "tel:" + v.replace(/[^0-9+]/g, ""); } }),
    field("visit.email", "Email", "Find us", { href: function (v) { return "mailto:" + v; } }),

    field("footer.tagline", "Footer tagline", "Footer", { input: "textarea", multiline: true }),
    field("footer.address", "Footer address", "Footer"),
  ];
  function applyContentToPage() {
    CONTENT_FIELDS.forEach(function (f) { f.apply(contentOverrides[f.key]); });
  }

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { toast("Storage error", "Your browser blocked local storage, so this couldn't be saved.", "error"); return false; }
  }

  /* ---------- state ---------- */
  var menu = load(MENU_KEY, null);
  if (!menu || !Array.isArray(menu) || !menu.length) {
    menu = SEED_MENU.map(function (m) { return Object.assign({ id: uid() }, m); });
    save(MENU_KEY, menu);
  }
  var bookings = load(BOOKINGS_KEY, []);
  if (!Array.isArray(bookings)) bookings = [];
  // PDPA retention: purge bookings whose reservation date (not submission
  // time) is more than RETENTION_DAYS in the past — matches the real
  // backend's purge() in overbrod-server/src/app.js.
  (function purgeOldBookings() {
    var cutoffDate = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
    var kept = bookings.filter(function (b) {
      return !(b && typeof b.date === "string" && b.date < cutoffDate);
    });
    if (kept.length !== bookings.length) { bookings = kept; save(BOOKINGS_KEY, bookings); }
  })();
  var contentOverrides = load(CONTENT_KEY, {});
  if (!contentOverrides || typeof contentOverrides !== "object") contentOverrides = {};
  var mediaLibrary = load(MEDIA_KEY, []);
  if (!Array.isArray(mediaLibrary)) mediaLibrary = [];
  var unlocked = false;
  var activeDietFilter = "All";
  var activeBookingFilter = "All";
  var lastFocused = null;
  var itemModalOpener = null;

  /* ---------- focus trap (for open dialogs) ---------- */
  function focusables(container) {
    return Array.prototype.slice
      .call(container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function trapTab(container, e) {
    if (e.key !== "Tab" || !container) return;
    var f = focusables(container);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- toasts ---------- */
  function toast(title, msg, kind) {
    var wrap = $("#toast-wrap");
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.setAttribute("role", "status");
    el.innerHTML = "<div><strong>" + esc(title) + "</strong>" + (msg ? "<span>" + esc(msg) + "</span>" : "") + "</div>";
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s, transform .3s";
      el.style.opacity = "0"; el.style.transform = "translateY(8px)";
      setTimeout(function () { el.remove(); }, 320);
    }, 4200);
  }

  /* ============================================================
     PUBLIC MENU
     ============================================================ */
  function publicMenu() {
    return menu.filter(function (m) { return m.available; });
  }

  function renderMenuFilters() {
    var root = $("#menu-filters");
    if (!root) return;
    var opts = ["All"].concat(DIETARY);
    root.innerHTML = opts.map(function (o) {
      return '<button type="button" class="menu__filter' + (o === activeDietFilter ? " is-active" : "") +
        '" data-diet="' + esc(o) + '" aria-pressed="' + (o === activeDietFilter) + '">' + esc(o) + "</button>";
    }).join("");
    $$(".menu__filter", root).forEach(function (b) {
      b.addEventListener("click", function () { activeDietFilter = b.getAttribute("data-diet"); renderMenuFilters(); renderMenu(); });
    });
  }

  function renderMenu() {
    var root = $("#menu-root");
    if (!root) return;
    var items = publicMenu().filter(function (m) {
      return activeDietFilter === "All" || (m.diet || []).indexOf(activeDietFilter) !== -1;
    });

    if (!items.length) {
      // distinguish "nothing on the menu at all" from "nothing under this filter"
      root.innerHTML = publicMenu().length
        ? '<p class="menu__empty">No dishes match that filter right now — try “All”.</p>'
        : '<p class="menu__empty">Our menu is being updated — please check back soon, or call us for today’s dishes.</p>';
      return;
    }

    var html = "";
    CATEGORIES.forEach(function (cat) {
      var group = items.filter(function (m) { return m.category === cat; });
      if (!group.length) return;
      html += '<div class="menu__group"><h3 class="menu__group-title"><span>' + nordicMark(esc(cat)) + "</span>" +
        "<small>" + group.length + " item" + (group.length > 1 ? "s" : "") + "</small></h3>";
      html += '<div class="menu__items">';
      group.forEach(function (m) {
        var priceLabel = m.addOn ? "+" + money(m.price) : money(m.price);
        var thumb = m.image
          ? '<div class="menu-item__thumb"><img src="' + esc(m.image) + '" alt="' + esc(m.name) + '" loading="lazy" /></div>'
          : '<div class="menu-item__thumb menu-item__thumb--ph" aria-hidden="true"></div>';
        var tags = (m.diet || []).map(function (d) { return '<span class="tag tag--diet">' + esc(d) + "</span>"; }).join("");
        html += '<article class="menu-item">' + thumb +
          '<div class="menu-item__body"><div class="menu-item__name">' +
          (m.signature ? '<span class="sig-flag">Signature</span> ' : "") + "<span>" + nordicMark(esc(m.name)) + "</span></div>" +
          (m.description ? '<p class="menu-item__desc">' + nordicMark(esc(m.description)) + "</p>" : "") +
          (tags ? '<div class="menu-item__tags">' + tags + "</div>" : "") +
          '</div><div class="menu-item__price">' + esc(priceLabel) + "</div></article>";
      });
      html += "</div></div>";
    });
    root.innerHTML = html;
  }

  /* ============================================================
     RESERVATION FORM
     ============================================================ */
  function fillReservationOptions() {
    var timeSel = $("#r-time");
    if (timeSel) {
      var slots = [];
      for (var h = 10; h <= 21; h++) {
        slots.push(pad(h) + ":00");
        if (h !== 21) slots.push(pad(h) + ":30");
      }
      slots.push("21:30");
      // dedupe + keep unique
      slots = slots.filter(function (v, i, a) { return a.indexOf(v) === i; });
      slots.forEach(function (t) {
        var o = document.createElement("option"); o.value = t; o.textContent = t; timeSel.appendChild(o);
      });
    }
    var party = $("#r-party");
    if (party) {
      for (var p = 1; p <= 12; p++) {
        var o2 = document.createElement("option");
        o2.value = String(p); o2.textContent = p + (p === 1 ? " guest" : " guests") + (p === 12 ? "+" : "");
        party.appendChild(o2);
      }
    }
    var dateInput = $("#r-date");
    if (dateInput) {
      var today = new Date();
      dateInput.min = isoDate(today);
      var max = new Date(); max.setDate(max.getDate() + 90);
      dateInput.max = isoDate(max);
    }
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function handleReserveSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var fields = ["date", "time", "party", "name", "phone", "email"];
    var ok = true, firstBad = null;
    fields.forEach(function (n) {
      var el = form.elements[n];
      var invalid = !el.value
        || (el.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value))
        // mirror the server's phone rule (validate.js) so a bad phone is
        // caught + highlighted instantly, not bounced back as a generic 400
        || (n === "phone" && !/^[0-9 +()\-]{3,}$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (invalid && ok) { ok = false; firstBad = el; }
    });
    var consent = $("#r-consent");
    if (!consent.checked) {
      if (ok) { firstBad = consent; }
      ok = false;
    }
    // date not in the past
    var dEl = form.elements["date"];
    if (dEl.value && dEl.value < isoDate(new Date())) {
      dEl.setAttribute("aria-invalid", "true");
      if (ok) { firstBad = dEl; }
      ok = false;
    }

    if (!ok) {
      toast("Almost there", !consent.checked ? "Please tick the PDPA consent box to continue." : "Please check the highlighted fields.", "error");
      if (firstBad) firstBad.focus();
      return;
    }

    var booking = {
      id: uid(),
      date: form.elements["date"].value,
      time: form.elements["time"].value,
      party: form.elements["party"].value,
      name: form.elements["name"].value.trim(),
      phone: form.elements["phone"].value.trim(),
      email: form.elements["email"].value.trim(),
      notes: form.elements["notes"].value.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // ---- API mode: send to the backend (stored server-side + emailed) ----
    if (apiMode) {
      var submitBtn = $("#reserve-form button[type=\"submit\"]");
      if (submitBtn) submitBtn.disabled = true;
      apiReq("POST", "/bookings", {
        name: booking.name, email: booking.email, phone: booking.phone,
        party: booking.party, date: booking.date, time: booking.time, notes: booking.notes,
      }).then(function () {
        form.reset();
        $$("[aria-invalid]", form).forEach(function (el) { el.setAttribute("aria-invalid", "false"); });
        toast("Table requested ✓", "Thanks " + booking.name.split(" ")[0] + " — we've received your request for " + prettyDate(booking.date) + " at " + booking.time + ". We'll confirm by phone or email shortly.", "success");
        if (unlocked) { loadBookings().then(renderBookings); }
      }).catch(function (err) {
        // If the server rejected specific fields (400 with fieldErrors),
        // highlight and focus the offending field with its exact reason
        // rather than a generic "something's wrong".
        var fieldErrors = err && err.data && err.data.details;
        if (err && err.status === 400 && fieldErrors && typeof fieldErrors === "object") {
          var firstBadName = null, firstMsg = "";
          Object.keys(fieldErrors).forEach(function (fname) {
            var el = form.elements[fname];
            var msgs = fieldErrors[fname];
            if (el && msgs && msgs.length) {
              el.setAttribute("aria-invalid", "true");
              if (!firstBadName) { firstBadName = fname; firstMsg = msgs[0]; }
            }
          });
          if (firstBadName) {
            var el2 = form.elements[firstBadName];
            if (el2 && el2.focus) el2.focus();
            toast("Please check your details", firstMsg || "The highlighted field isn't in a format we can accept.", "error");
            return;
          }
        }
        toast(err && err.status === 429 ? "Too many requests" : "Couldn't send", (err && err.message) || "Please try again, or call us to book.", "error");
      }).then(function () { if (submitBtn) submitBtn.disabled = false; });
      return;
    }

    // ---- demo mode (static, no backend): keep on device + email fallback ----
    bookings.push(booking);
    save(BOOKINGS_KEY, bookings);

    // Deliver the request to the deli. With no backend, the reliable
    // no-server option is a pre-filled email to the deli's inbox — so the
    // booking actually reaches OVERBRØD instead of only sitting on the
    // customer's device. (A backend/booking API is the robust replacement.)
    var subject = "Table request — " + booking.name + " — " + prettyDate(booking.date) + " " + booking.time;
    var body = [
      "New reservation request from the OVERBRØD website:",
      "",
      "Name:   " + booking.name,
      "Date:   " + prettyDate(booking.date) + " (" + booking.date + ")",
      "Time:   " + booking.time,
      "Guests: " + booking.party,
      "Phone:  " + booking.phone,
      "Email:  " + booking.email,
      "Notes:  " + (booking.notes || "—"),
    ].join("\n");
    var mailto = "mailto:overbrodsg@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    form.reset();
    $$("[aria-invalid]", form).forEach(function (el) { el.setAttribute("aria-invalid", "false"); });
    toast("Almost done — sending your request", "Your email app is opening with the details. Press send and we'll confirm by phone or email.", "success");
    if (unlocked) renderBookings();
    // open the mail composer after the toast paints
    setTimeout(function () { window.location.href = mailto; }, 400);
  }

  function prettyDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  /* ============================================================
     OPEN / CLOSED STATUS (Singapore time)
     ============================================================ */
  function sgtNow() {
    try {
      var fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Singapore", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      });
      var parts = {};
      fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var h = parseInt(parts.hour, 10); if (h === 24) h = 0;
      return { day: days[parts.weekday], minutes: h * 60 + parseInt(parts.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function renderOpenStatus() {
    var el = $("#open-status");
    if (!el) return;
    var now = sgtNow();
    var weekend = now.day === 0 || now.day === 6;
    var windows = weekend ? [[600, 1320]] : [[660, 870], [1020, 1230]]; // mins from midnight
    var open = windows.some(function (w) { return now.minutes >= w[0] && now.minutes < w[1]; });
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
    el.textContent = open ? "Open now" : "Closed right now";
  }

  /* ============================================================
     STAFF PORTAL
     ============================================================ */
  function openPortal() {
    lastFocused = document.activeElement;
    var portal = $("#portal");
    portal.hidden = false;
    portal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (unlocked) { showDash(); }
    else {
      $("#portal-login").hidden = false;
      $("#portal-dash").hidden = true;
      $("#portal-err").hidden = true;
      var pass = $("#portal-pass");
      pass.value = "";
      setTimeout(function () { pass.focus(); }, 40);
    }
  }
  function closePortal() {
    var portal = $("#portal");
    portal.hidden = true;
    portal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function showDash() {
    $("#portal-login").hidden = true;
    $("#portal-dash").hidden = false;
    Promise.all([loadBookings(), loadMenu(), loadContent(), loadMediaLibrary()]).then(function () {
      renderBookingFilters();
      renderBookings();
      renderCMS();
      renderContentForm();
      renderMediaLibrary();
    }).catch(apiErr);
  }
  function handleLogin(e) {
    e.preventDefault();
    var val = $("#portal-pass").value;
    function fail() { $("#portal-err").hidden = false; $("#portal-pass").focus(); $("#portal-pass").select(); }
    if (apiMode) {
      apiReq("POST", "/staff/login", { password: val }).then(function () {
        unlocked = true; $("#portal-err").hidden = true; showDash();
      }).catch(fail);
      return;
    }
    if (val === STAFF_PASSWORD) { unlocked = true; $("#portal-err").hidden = true; showDash(); }
    else { fail(); }
  }

  /* ---------- bookings management ---------- */
  var BOOKING_STATUSES = ["All", "Pending", "Confirmed", "Cancelled"];
  function renderBookingFilters() {
    var root = $("#booking-filters");
    root.innerHTML = BOOKING_STATUSES.map(function (s) {
      var count = s === "All" ? bookings.length : bookings.filter(function (b) { return b.status === s.toLowerCase(); }).length;
      return '<button type="button" class="menu__filter' + (s === activeBookingFilter ? " is-active" : "") +
        '" data-bfilter="' + s + '">' + s + ' <span aria-hidden="true">· ' + count + "</span></button>";
    }).join("");
    $$("[data-bfilter]", root).forEach(function (b) {
      b.addEventListener("click", function () { activeBookingFilter = b.getAttribute("data-bfilter"); renderBookingFilters(); renderBookings(); });
    });
  }
  function renderBookings() {
    var root = $("#bookings-root");
    var list = bookings.slice().filter(function (b) {
      return activeBookingFilter === "All" || b.status === activeBookingFilter.toLowerCase();
    });
    list.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });

    if (!list.length) {
      root.innerHTML = '<p class="portal__empty">No ' + (activeBookingFilter === "All" ? "" : activeBookingFilter.toLowerCase() + " ") + "bookings yet.</p>";
      renderBookingFilters();
      return;
    }
    root.innerHTML = list.map(function (b) {
      var actions = "";
      if (b.status === "pending") {
        actions += '<button class="icon-btn icon-btn--accept" data-accept="' + b.id + '">Accept</button>';
        actions += '<button class="icon-btn" data-cancel="' + b.id + '">Cancel</button>';
      } else if (b.status === "confirmed") {
        actions += '<button class="icon-btn" data-cancel="' + b.id + '">Cancel</button>';
      } else if (b.status === "cancelled") {
        actions += '<button class="icon-btn icon-btn--accept" data-accept="' + b.id + '">Restore</button>';
      }
      actions += '<button class="icon-btn icon-btn--danger" data-delete="' + b.id + '">Delete</button>';
      return '<div class="booking">' +
        '<div class="booking__when"><div class="booking__date">' + esc(prettyDate(b.date)) + '</div><div class="booking__time">' + esc(b.time) + "</div></div>" +
        '<div class="booking__who"><strong>' + esc(b.name) + "</strong> · " + esc(b.party) + " guest" + (b.party === "1" ? "" : "s") +
        '<div class="booking__meta">' + esc(b.phone) + " · " + esc(b.email) + "</div>" +
        (b.notes ? '<div class="booking__notes">“' + esc(b.notes) + "”</div>" : "") + "</div>" +
        '<div class="booking__side"><span class="status-pill status-pill--' + b.status + '">' + b.status + "</span>" +
        '<div class="booking__actions">' + actions + "</div></div></div>";
    }).join("");

    $$("[data-accept]", root).forEach(function (btn) { btn.addEventListener("click", function () { setBookingStatus(btn.getAttribute("data-accept"), "confirmed"); }); });
    $$("[data-cancel]", root).forEach(function (btn) { btn.addEventListener("click", function () { setBookingStatus(btn.getAttribute("data-cancel"), "cancelled"); }); });
    $$("[data-delete]", root).forEach(function (btn) { btn.addEventListener("click", function () { deleteBooking(btn.getAttribute("data-delete")); }); });
    renderBookingFilters();
  }
  function setBookingStatus(id, status) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    var label = b.name + " · " + prettyDate(b.date) + " " + b.time;
    if (apiMode) {
      apiReq("PATCH", "/staff/bookings/" + id, { status: status })
        .then(loadBookings).then(function () { renderBookings(); toast("Booking " + status, label, status === "confirmed" ? "success" : null); })
        .catch(apiErr);
      return;
    }
    b.status = status;
    save(BOOKINGS_KEY, bookings);
    renderBookings();
    toast("Booking " + status, label, status === "confirmed" ? "success" : null);
  }
  function deleteBooking(id) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    if (!confirm("Delete the booking for " + b.name + " on " + prettyDate(b.date) + "? This cannot be undone.")) return;
    if (apiMode) {
      apiReq("DELETE", "/staff/bookings/" + id).then(loadBookings)
        .then(function () { renderBookings(); toast("Booking deleted", null); }).catch(apiErr);
      return;
    }
    bookings = bookings.filter(function (x) { return x.id !== id; });
    save(BOOKINGS_KEY, bookings);
    renderBookings();
    toast("Booking deleted", null);
  }

  /* ---------- menu CMS (CRUD) ---------- */
  function renderCMS() {
    var root = $("#cms-root");
    var html = "";
    CATEGORIES.forEach(function (cat) {
      var group = menu.filter(function (m) { return m.category === cat; });
      if (!group.length) return;
      html += '<div class="cms__cat">' + nordicMark(esc(cat)) + "</div>";
      group.forEach(function (m) {
        html += '<div class="cms-item' + (m.available ? "" : " is-off") + '">' +
          '<div><div class="cms-item__name">' +
          '<span class="dot' + (m.available ? "" : " dot--off") + '"></span>' +
          nordicMark(esc(m.name)) +
          (m.signature ? ' <span class="sig-flag">Signature</span>' : "") +
          (m.available ? "" : ' <span class="badge-off">Hidden</span>') +
          "</div>" +
          (m.diet && m.diet.length ? '<div class="cms-item__sub">' + esc(m.diet.join(" · ")) + "</div>" : "") +
          "</div>" +
          '<div class="cms-item__price">' + (m.addOn ? "+" : "") + money(m.price) + "</div>" +
          '<div class="cms-item__actions">' +
          '<button class="icon-btn" data-edit="' + m.id + '">Edit</button>' +
          '<button class="icon-btn" data-toggle="' + m.id + '">' + (m.available ? "Hide" : "Show") + "</button>" +
          '<button class="icon-btn icon-btn--danger" data-del="' + m.id + '">Delete</button>' +
          "</div></div>";
      });
    });
    root.innerHTML = html || '<p class="portal__empty">No menu items yet. Use “+ Add item” above to create your first one.</p>';
    $$("[data-edit]", root).forEach(function (b) { b.addEventListener("click", function () { openItemModal(b.getAttribute("data-edit")); }); });
    $$("[data-toggle]", root).forEach(function (b) { b.addEventListener("click", function () { toggleAvailable(b.getAttribute("data-toggle")); }); });
    $$("[data-del]", root).forEach(function (b) { b.addEventListener("click", function () { deleteItem(b.getAttribute("data-del")); }); });
  }
  // Item → API payload shape (matches the server's menuItemSchema).
  function menuPayload(m) {
    return {
      name: m.name, price: m.price, category: m.category, image: m.image || "",
      description: m.description || "", signature: !!m.signature, available: !!m.available,
      addOn: !!m.addOn, diet: m.diet || [],
    };
  }
  function toggleAvailable(id) {
    var m = menu.find(function (x) { return x.id === id; });
    if (!m) return;
    if (apiMode) {
      var payload = menuPayload(m); payload.available = !m.available;
      apiReq("PATCH", "/staff/menu/" + id, payload).then(loadMenu)
        .then(function () { renderCMS(); renderMenu(); }).catch(apiErr);
      return;
    }
    m.available = !m.available;
    save(MENU_KEY, menu);
    renderCMS(); renderMenu();
  }
  function deleteItem(id) {
    var m = menu.find(function (x) { return x.id === id; });
    if (!m) return;
    if (!confirm('Delete "' + m.name + '" from the menu?')) return;
    if (apiMode) {
      apiReq("DELETE", "/staff/menu/" + id).then(loadMenu)
        .then(function () { renderCMS(); renderMenu(); toast("Item deleted", m.name); }).catch(apiErr);
      return;
    }
    menu = menu.filter(function (x) { return x.id !== id; });
    save(MENU_KEY, menu);
    renderCMS(); renderMenu();
    toast("Item deleted", m.name);
  }

  /* ---------- item editor modal ---------- */
  function fillCategorySelect() {
    var sel = $("#item-category");
    sel.innerHTML = CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
  }
  function openItemModal(id) {
    var modal = $("#item-modal");
    var item = id ? menu.find(function (x) { return x.id === id; }) : null;
    $("#item-modal-title").textContent = item ? "Edit item" : "Add item";
    $("#item-id").value = item ? item.id : "";
    $("#item-name").value = item ? item.name : "";
    $("#item-price").value = item ? item.price : "";
    $("#item-category").value = item ? item.category : CATEGORIES[0];
    $("#item-image").value = item ? (item.image || "") : "";
    $("#item-desc").value = item ? (item.description || "") : "";
    $("#item-signature").checked = item ? !!item.signature : false;
    $("#item-available").checked = item ? !!item.available : true;
    $$("#item-diet input").forEach(function (cb) { cb.checked = item ? (item.diet || []).indexOf(cb.value) !== -1 : false; });
    itemModalOpener = document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () { $("#item-name").focus(); }, 40);
  }
  function closeItemModal() {
    var modal = $("#item-modal");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    if (itemModalOpener && itemModalOpener.focus) itemModalOpener.focus();
  }
  function saveItem(e) {
    e.preventDefault();
    var id = $("#item-id").value;
    var name = $("#item-name").value.trim();
    var price = parseFloat($("#item-price").value);
    if (!name || isNaN(price)) { toast("Missing details", "A name and a valid price are required.", "error"); return; }
    var image = $("#item-image").value.trim();
    if (image && !SAFE_IMG.test(image)) {
      toast("Image not added", "Use an https:// image link (or leave blank for the Ø placeholder).", "error");
      return;
    }
    var data = {
      name: name,
      price: price,
      category: $("#item-category").value,
      image: image,
      description: $("#item-desc").value.trim(),
      signature: $("#item-signature").checked,
      available: $("#item-available").checked,
      diet: $$("#item-diet input").filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; }),
    };
    if (apiMode) {
      // preserve add-on flag on edit (not exposed in the editor)
      var existing = id ? menu.find(function (x) { return x.id === id; }) : null;
      data.addOn = existing ? !!existing.addOn : false;
      var req = id ? apiReq("PATCH", "/staff/menu/" + id, data) : apiReq("POST", "/staff/menu", data);
      req.then(loadMenu).then(function () {
        closeItemModal(); renderCMS(); renderMenu();
        toast(id ? "Item updated" : "Item added", name, "success");
      }).catch(apiErr);
      return;
    }
    if (id) {
      var m = menu.find(function (x) { return x.id === id; });
      if (m) { Object.assign(m, data); }
    } else {
      menu.push(Object.assign({ id: uid() }, data));
    }
    save(MENU_KEY, menu);
    closeItemModal();
    renderCMS(); renderMenu();
    toast(id ? "Item updated" : "Item added", name, "success");
  }

  /* ============================================================
     CONTENT TAB — every field in CONTENT_FIELDS, grouped by section.
     Leaving a field blank and saving resets it to the page's default
     (removes the override) rather than storing an empty string.
     ============================================================ */
  function renderContentForm() {
    var root = $("#content-root");
    var groups = [];
    CONTENT_FIELDS.forEach(function (f) {
      var g = groups[groups.length - 1];
      if (!g || g.name !== f.group) { g = { name: f.group, fields: [] }; groups.push(g); }
      g.fields.push(f);
    });
    root.innerHTML = groups.map(function (g) {
      var rows = g.fields.map(function (f) {
        var val = contentOverrides[f.key] || "";
        var inputId = "cf-" + f.key.replace(/\./g, "-");
        var inputHtml = f.input === "textarea"
          ? '<textarea id="' + inputId + '" data-content-key="' + f.key + '" rows="3" placeholder="(using page default)">' + esc(val) + "</textarea>"
          : '<input type="text" id="' + inputId + '" data-content-key="' + f.key + '" value="' + esc(val) + '" placeholder="(using page default)" />';
        var mediaControls = "";
        if (f.input === "image" || f.input === "video") {
          mediaControls =
            '<label class="btn btn--ghost btn--sm content-upload-btn">Upload' +
            '<input type="file" data-upload-for="' + f.key + '" accept="' + (f.input === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif") + '" hidden /></label>';
          if (f.input === "image" && val) mediaControls += '<img class="content-thumb" src="' + esc(val) + '" alt="" />';
        }
        return '<div class="content-field">' +
          '<label for="' + inputId + '">' + esc(f.label) + "</label>" +
          '<div class="content-field__row">' + inputHtml + mediaControls + "</div>" +
          "</div>";
      }).join("");
      return '<fieldset class="content-group"><legend>' + esc(g.name) + "</legend>" + rows + "</fieldset>";
    }).join("");

    $$("[data-upload-for]", root).forEach(function (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var key = input.getAttribute("data-upload-for");
        uploadMediaFile(file).then(function (media) {
          var target = $('[data-content-key="' + key + '"]', root);
          if (target) target.value = media.url;
          toast("Uploaded", file.name, "success");
        }).catch(apiErr);
      });
    });
  }
  function saveAllContent() {
    var root = $("#content-root");
    var toSave = {}, toReset = [];
    $$("[data-content-key]", root).forEach(function (el) {
      var key = el.getAttribute("data-content-key");
      var val = el.value.trim();
      if (val) toSave[key] = val;
      else if (contentOverrides[key]) toReset.push(key);
    });
    if (!Object.keys(toSave).length && !toReset.length) { toast("Nothing to save", "No fields were changed."); return; }

    function afterSave() {
      toast("Content saved", "Reloading to show the update…", "success");
      setTimeout(function () { location.reload(); }, 800);
    }
    if (apiMode) {
      var ops = [];
      if (Object.keys(toSave).length) ops.push(apiReq("PUT", "/staff/content", { entries: toSave }));
      toReset.forEach(function (key) { ops.push(apiReq("DELETE", "/staff/content/" + encodeURIComponent(key)).catch(function () {})); });
      Promise.all(ops).then(afterSave).catch(apiErr);
      return;
    }
    Object.assign(contentOverrides, toSave);
    toReset.forEach(function (key) { delete contentOverrides[key]; });
    save(CONTENT_KEY, contentOverrides);
    afterSave();
  }
  function resetAllContent() {
    var warned = confirm(
      "All content changes on this website will be reset back to default " +
      "(the original text and images when the site was created). There is no reverting this."
    );
    if (!warned) return;
    function afterReset() {
      toast("Content reset", "Reloading to show the defaults…", "success");
      setTimeout(function () { location.reload(); }, 800);
    }
    if (apiMode) {
      apiReq("DELETE", "/staff/content").then(afterReset).catch(apiErr);
      return;
    }
    contentOverrides = {};
    save(CONTENT_KEY, contentOverrides);
    afterReset();
  }

  /* ============================================================
     MEDIA LIBRARY — upload, browse, delete images/video used across
     the site's Content fields and menu item photos.
     ============================================================ */
  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }
  function renderMediaLibrary() {
    var root = $("#media-root");
    if (!mediaLibrary.length) { root.innerHTML = '<p class="portal__empty">No uploads yet.</p>'; return; }
    root.innerHTML = mediaLibrary.map(function (m) {
      var isImg = /^image\//.test(m.mime);
      var preview = isImg
        ? '<img class="media-card__thumb" src="' + esc(m.url) + '" alt="" />'
        : '<video class="media-card__thumb" src="' + esc(m.url) + '" muted></video>';
      return '<div class="media-card">' + preview +
        '<div class="media-card__name" title="' + esc(m.filename) + '">' + esc(m.filename) + "</div>" +
        '<div class="media-card__meta">' + esc(formatBytes(m.size)) + "</div>" +
        '<div class="media-card__actions">' +
        '<button type="button" class="icon-btn" data-copy="' + esc(m.url) + '">Copy URL</button>' +
        '<button type="button" class="icon-btn icon-btn--danger" data-media-del="' + m.id + '">Delete</button>' +
        "</div></div>";
    }).join("");
    $$("[data-copy]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var url = b.getAttribute("data-copy");
        var abs = /^https?:|^data:/i.test(url) ? url : location.origin + url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(abs).then(function () { toast("Copied", url, "success"); }).catch(function () { toast("Copy this URL", url); });
        } else { toast("Copy this URL", url); }
      });
    });
    $$("[data-media-del]", root).forEach(function (b) {
      b.addEventListener("click", function () { deleteMediaItem(b.getAttribute("data-media-del")); });
    });
  }
  var UPLOAD_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"];
  function uploadMediaFile(file) {
    if (apiMode) {
      var fd = new FormData();
      fd.append("file", file);
      return fetch(API + "/staff/media", { method: "POST", credentials: "same-origin", body: fd })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (!r.ok) throw new Error(data.error || "Upload failed");
            return data;
          });
        })
        .then(function (media) { return loadMediaLibrary().then(function () { renderMediaLibrary(); return media; }); });
    }
    return new Promise(function (resolve, reject) {
      var ext = (file.name.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
      if (UPLOAD_EXTS.indexOf(ext) === -1 || !/^(image|video)\//.test(file.type)) {
        reject(new Error("Unsupported file type")); return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var media = { id: uid(), filename: file.name.slice(0, 200), url: reader.result, mime: file.type, size: file.size, created_at: new Date().toISOString() };
        mediaLibrary.unshift(media);
        save(MEDIA_KEY, mediaLibrary);
        renderMediaLibrary();
        resolve(media);
      };
      reader.onerror = function () { reject(new Error("Couldn't read that file")); };
      reader.readAsDataURL(file);
    });
  }
  // Where (if anywhere) a media URL is currently in use, as human-readable
  // lines — so deleting a still-referenced file warns the staff exactly what
  // will break instead of silently leaving dangling <img>/<video> srcs.
  function mediaReferences(url) {
    var refs = [];
    Object.keys(contentOverrides).forEach(function (k) {
      if (contentOverrides[k] === url) {
        var f = null;
        for (var i = 0; i < CONTENT_FIELDS.length; i++) { if (CONTENT_FIELDS[i].key === k) { f = CONTENT_FIELDS[i]; break; } }
        refs.push("Content · " + (f ? f.group + " → " + f.label : k));
      }
    });
    menu.forEach(function (mi) { if (mi.image === url) refs.push("Menu item · " + mi.name); });
    return refs;
  }
  function deleteMediaItem(id) {
    var m = mediaLibrary.find(function (x) { return x.id === id; });
    if (!m) return;
    var refs = mediaReferences(m.url);
    var warn;
    if (refs.length) {
      warn = 'Delete "' + m.filename + '"?\n\nIt is currently used in ' + refs.length + " place" + (refs.length > 1 ? "s" : "") + ":\n• " + refs.join("\n• ") +
        "\n\nDeleting it will leave a broken image/video there until you point those at something else. Delete anyway?";
    } else {
      warn = 'Delete "' + m.filename + '" from the media library? This can\'t be undone.';
    }
    if (!confirm(warn)) return;
    if (apiMode) {
      apiReq("DELETE", "/staff/media/" + id).then(loadMediaLibrary).then(function () { renderMediaLibrary(); toast("Deleted", m.filename); }).catch(apiErr);
      return;
    }
    mediaLibrary = mediaLibrary.filter(function (x) { return x.id !== id; });
    save(MEDIA_KEY, mediaLibrary);
    renderMediaLibrary();
    toast("Deleted", m.filename);
  }

  /* ============================================================
     TABS
     ============================================================ */
  function initTabs() {
    $$(".portal__tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.getAttribute("data-tab");
        $$(".portal__tab").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        $$(".portal__tabpanel").forEach(function (p) {
          p.hidden = p.getAttribute("data-panel") !== name;
        });
      });
    });
  }

  /* ============================================================
     HERO VIDEO (deconstructed smørrebrød)
     Load + autoplay the heavy film only on larger screens without a
     reduced-motion preference. Everyone else keeps the lightweight
     poster still. No loop within a single viewing — it plays the
     deconstruction once and rests on the exploded frame. But each time
     the hero scrolls back into view after having left, it resets and
     replays from the start, so the reveal isn't a one-time-per-session
     thing.
     ============================================================ */
  function initHeroVideo() {
    var v = $(".hero__video");
    if (!v) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var large = window.matchMedia && window.matchMedia("(min-width: 768px)").matches;
    if (reduce || !large) return; // poster only
    // Inject sources on demand: WebM first (Chrome/Firefox/Edge), MP4/H.264
    // fallback (Safari). The browser plays the first it supports. Safe to
    // call more than once (e.g. once at load, again once a CMS content
    // override for the video has fetched) — clears any sources from a
    // previous call first rather than duplicating them.
    $$("source", v).forEach(function (s) { s.remove(); });
    var webm = v.getAttribute("data-webm");
    var mp4 = v.getAttribute("data-mp4");
    if (!webm && !mp4) return;
    if (webm) { var s1 = document.createElement("source"); s1.src = webm; s1.type = "video/webm"; v.appendChild(s1); }
    if (mp4) { var s2 = document.createElement("source"); s2.src = mp4; s2.type = "video/mp4"; v.appendChild(s2); }
    v.preload = "auto";
    v.load();
    function replay() {
      v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () {}); // ignore autoplay rejection
    }
    replay();

    if ("IntersectionObserver" in window) {
      var hero = v.closest(".hero");
      var wasVisible = true; // already on screen at load, so the first play() above covers it
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !wasVisible) replay();
          wasVisible = entry.isIntersecting;
        });
      }, { threshold: 0.4 }).observe(hero);
    }
  }

  /* ============================================================
     INSTAGRAM GALLERY (static — plays videos in place on click)
     Photos are inert. Videos swap their poster for a real <video controls
     autoplay> the first time they're activated (click or Enter/Space).
     Nothing in this gallery links to Instagram except the Follow button.
     ============================================================ */
  function playInstaVideo(tile) {
    if (tile.classList.contains("is-playing")) return;
    var webm = tile.getAttribute("data-webm");
    var mp4 = tile.getAttribute("data-mp4");
    if (!webm && !mp4) {
      toast("Video not added yet", "Drop the file in and set data-webm/data-mp4 on this tile.", "error");
      return;
    }
    var video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    if (webm) { var s1 = document.createElement("source"); s1.src = webm; s1.type = "video/webm"; video.appendChild(s1); }
    if (mp4) { var s2 = document.createElement("source"); s2.src = mp4; s2.type = "video/mp4"; video.appendChild(s2); }
    tile.appendChild(video);
    tile.classList.add("is-playing");
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }
  function initInstaVideos() {
    $$(".insta__tile--video").forEach(function (tile) {
      tile.addEventListener("click", function () { playInstaVideo(tile); });
      tile.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playInstaVideo(tile); }
      });
    });
  }

  /* ============================================================
     RESERVE EMBERS — a handful of drifting sparks that lean subtly
     toward the cursor, like heat bending toward a draft. Depth varies
     per ember (--depth, set in CSS) so nearer sparks drift a little
     further than distant ones. Disabled under reduced motion.
     ============================================================ */
  function initEmberParallax() {
    var field = $(".reserve__embers");
    if (!field) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    var section = $("#reserve");
    var ticking = false;
    var dx = 0, dy = 0;
    function apply() {
      ticking = false;
      field.style.setProperty("--ember-dx", dx.toFixed(1) + "px");
      field.style.setProperty("--ember-dy", dy.toFixed(1) + "px");
    }
    section.addEventListener("mousemove", function (e) {
      var r = section.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      var ny = (e.clientY - r.top) / r.height - 0.5;
      dx = nx * 16; // max ~8px either side, scaled per-ember by --depth
      dy = ny * 10;
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    });
    section.addEventListener("mouseleave", function () {
      dx = 0; dy = 0;
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    });
  }

  /* ============================================================
     STORY & MENU — a faint cursor-following glow (--mx/--my consumed by
     the section's own background-image in CSS) plus a one-time
     scroll-reveal. Both no-ops under reduced motion.
     ============================================================ */
  function initCursorSpotlight() {
    [$("#story"), $("#menu")].forEach(function (section) {
      if (!section) return;
      var ticking = false, mx = 30, my = 20;
      function apply() {
        ticking = false;
        section.style.setProperty("--mx", mx.toFixed(1) + "%");
        section.style.setProperty("--my", my.toFixed(1) + "%");
      }
      section.addEventListener("mousemove", function (e) {
        var r = section.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width) * 100;
        my = ((e.clientY - r.top) / r.height) * 100;
        if (!ticking) { ticking = true; requestAnimationFrame(apply); }
      });
    });
  }

  var revealObserver = null;
  function revealIO() {
    if (revealObserver || !("IntersectionObserver" in window)) return revealObserver;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    return revealObserver;
  }
  // Safe to call repeatedly (e.g. after the menu re-renders): elements
  // already bound are skipped, so nothing re-animates or double-observes.
  function initScrollReveal() {
    var io = revealIO();
    if (!io) return;
    var targets = [];
    var lede = $(".story__lede");
    if (lede && !lede.dataset.revealBound) targets.push(lede);
    var photo = $(".story__photo");
    if (photo && !photo.dataset.revealBound) { photo.style.transitionDelay = "120ms"; targets.push(photo); }
    $$(".story__craft li").forEach(function (li, i) {
      if (li.dataset.revealBound) return;
      li.style.transitionDelay = (i * 60) + "ms";
      targets.push(li);
    });
    $$(".menu__group").forEach(function (group) {
      $$(".menu-item", group).forEach(function (item, i) {
        if (item.dataset.revealBound) return;
        item.style.transitionDelay = Math.min(i * 45, 270) + "ms";
        targets.push(item);
      });
    });
    // Review + Find-us cards rise in a staggered sequence as they scroll up.
    [".review", ".visit__card"].forEach(function (sel) {
      $$(sel).forEach(function (card, i) {
        if (card.dataset.revealBound) return;
        card.style.transitionDelay = (i * 90) + "ms";
        targets.push(card);
      });
    });
    // Instagram: the profile row, then each tile in a quick cascade.
    var insta = $(".insta__profile");
    if (insta && !insta.dataset.revealBound) targets.push(insta);
    $$(".insta__tile").forEach(function (tile, i) {
      if (tile.dataset.revealBound) return;
      tile.style.transitionDelay = Math.min(i * 55, 220) + "ms";
      targets.push(tile);
    });
    var reserveIntro = $(".reserve__intro");
    if (reserveIntro && !reserveIntro.dataset.revealBound) targets.push(reserveIntro);
    targets.forEach(function (t) { t.dataset.revealBound = "1"; t.classList.add("reveal"); io.observe(t); });
  }

  /* ============================================================
     HERO PARALLAX — the background film/poster drifts slower than the
     page scrolls (classic parallax), via a single rAF-throttled scroll
     handler updating --parallax-y. Off under reduced motion (CSS also
     forces it off as a belt-and-braces measure).
     ============================================================ */
  function initHeroParallax() {
    var media = $(".hero__media");
    if (!media) return;
    var ticking = false;
    function apply() {
      ticking = false;
      var y = Math.min(window.scrollY * 0.28, 140); // clamp so it never drifts far
      media.style.setProperty("--parallax-y", y.toFixed(1) + "px");
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* ============================================================
     NAV SCROLL STATE — a scroll-triggered class toggle (distinct from
     the reveal system): once you've scrolled past the hero, the sticky
     nav picks up a soft cast shadow.
     ============================================================ */
  function initNavScrollState() {
    var nav = $(".nav");
    if (!nav) return;
    var ticking = false;
    function apply() {
      ticking = false;
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* ============================================================
     THEME TOGGLE — light/dark. The inline bootstrap script in <head>
     (allowed under CSP by exact sha256 hash) already set [data-theme] on
     <html> from localStorage before first paint, so this just wires the
     button to flip it and keep the icon + persisted choice in sync.
     ============================================================ */
  var THEME_KEY = "overbrod-theme";
  function initThemeToggle() {
    var btn = $("#theme-toggle");
    if (!btn) return;
    var root = document.documentElement;
    function apply(theme) {
      root.setAttribute("data-theme", theme);
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    }
    // Normally the inline bootstrap script in <head> already set this from
    // localStorage before paint. Fall back to reading it directly here too
    // (defense in depth) in case that inline script is ever blocked — e.g.
    // a stricter CSP layer (proxy, CDN) in front of the site that doesn't
    // carry the same sha256 allowance as index.html's own CSP.
    var current = root.getAttribute("data-theme");
    if (current !== "light" && current !== "dark") {
      try { current = localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch (e) { current = "dark"; }
    }
    apply(current);
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ============================================================
     REVIEW CARD TILT — a subtle cursor-driven perspective tilt on
     each review card (desktop pointer only; skipped on touch and
     under reduced motion). Sets --tilt-x/--tilt-y, consumed by the
     card's own transform in CSS.
     ============================================================ */
  function initReviewTilt() {
    if (!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    $$(".review").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tilt-y", (nx * 7).toFixed(2) + "deg");
        card.style.setProperty("--tilt-x", (-ny * 7).toFixed(2) + "deg");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* ============================================================
     REVIEWS CAROUSEL — a real scrollable, snapping track (native
     touch-swipe/trackpad-drag work for free) with arrow buttons, dot
     indicators, and arrow-key support layered on top.
     ============================================================ */
  function initReviewsCarousel() {
    var track = $("#reviews-track");
    if (!track) return;
    var slides = $$(".review", track);
    var dots = $$(".reviews__dot");
    var prevBtn = $('.reviews__arrow[data-dir="-1"]');
    var nextBtn = $('.reviews__arrow[data-dir="1"]');
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = 0;
    // Button/dot/keyboard nav sets the active state directly (intent is
    // unambiguous). A programmatic (smooth) scroll can outlast any fixed
    // timer and fire a "settle" while still mid-flight, so instead of a
    // fixed suppression window we mark the next scroll-settle as
    // programmatic and skip re-deriving the index from it — otherwise the
    // not-yet-arrived scroll position resets `current` and the next click
    // just repeats the move (the "click twice to advance once" bug). Only
    // genuine user drag/trackpad scrolls sync back via nearestIndex().
    var programmatic = false, settleTimer = null;

    function goTo(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      setActive(i);
      programmatic = true;
      var target = slides[i];
      track.scrollTo({
        left: target.offsetLeft - track.offsetLeft,
        behavior: reduce ? "auto" : "smooth",
      });
    }
    function setActive(i) {
      current = i;
      dots.forEach(function (d, di) {
        var active = di === i;
        d.classList.toggle("is-active", active);
        d.setAttribute("aria-selected", active ? "true" : "false");
      });
      if (prevBtn) prevBtn.disabled = i === 0;
      if (nextBtn) nextBtn.disabled = i === slides.length - 1;
    }
    function nearestIndex() {
      // At either end of the track, the browser clamps scrollLeft to the
      // valid range — with wide cards that can land short of a middle
      // slide's "ideal" left-aligned offset, so a raw nearest-offset
      // comparison can misjudge the last slide as the second-to-last.
      // Clamp explicitly at the boundaries first.
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft <= 1) return 0;
      if (track.scrollLeft >= maxScroll - 1) return slides.length - 1;
      var pos = track.scrollLeft + track.offsetLeft;
      var best = 0, bestDist = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - pos);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); });
    dots.forEach(function (dot, i) { dot.addEventListener("click", function () { goTo(i); }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
    });
    track.addEventListener("scroll", function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        // once scrolling has actually stopped: a programmatic scroll's
        // settle is ignored (current is already correct); a user scroll
        // syncs the active index to wherever they landed.
        if (programmatic) { programmatic = false; return; }
        setActive(nearestIndex());
      }, 150);
    }, { passive: true });

    setActive(0);
  }

  /* ============================================================
     DISH SLIDER — a full-bleed, morphing smørrebrød showcase. Each dish
     is a stacked panel; navigation crossfades between them (the colour,
     ghost name, plated dish and floating garnish all animate). Driven by
     arrows, dots, arrow keys, and horizontal drag/swipe. Wraps around.
     ============================================================ */
  function initDishSlider() {
    var stage = $("#dishes-stage");
    if (!stage) return;
    var slides = $$(".dish", stage);
    if (!slides.length) return;
    var dots = $$(".dishes__dot");
    var prevBtn = $('.dishes__arrow[data-dir="-1"]');
    var nextBtn = $('.dishes__arrow[data-dir="1"]');
    var live = $(".dishes__live");
    // derive the starting index from whichever slide is already marked
    // active in the HTML, rather than assuming 0 — so the initially-shown
    // dish (set purely by markup) and the JS's own tracking never drift
    // out of sync with each other.
    var current = 0;
    slides.forEach(function (s, i) { if (s.classList.contains("is-active")) current = i; });

    function go(i) {
      i = (i % slides.length + slides.length) % slides.length; // wrap
      if (i === current) return;
      slides.forEach(function (s, si) {
        var active = si === i;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach(function (d, di) {
        var active = di === i;
        d.classList.toggle("is-active", active);
        d.setAttribute("aria-selected", active ? "true" : "false");
      });
      current = i;
      if (live) live.textContent = slides[i].getAttribute("aria-label") || "";
    }
    function step(d) { go(current + d); }

    if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });
    dots.forEach(function (dot, i) { dot.addEventListener("click", function () { go(i); }); });

    stage.tabIndex = 0;
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    });
    // roving arrow-key nav while a dot is focused
    dots.forEach(function (dot) {
      dot.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); step(1); dots[current].focus(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); dots[current].focus(); }
      });
    });

    // horizontal drag / swipe (touch-action: pan-y keeps vertical scroll)
    var startX = null, dragging = false;
    stage.addEventListener("pointerdown", function (e) {
      startX = e.clientX; dragging = true; stage.classList.add("is-grabbing");
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      dragging = false; stage.classList.remove("is-grabbing");
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      startX = null;
    });
    stage.addEventListener("pointercancel", function () {
      dragging = false; stage.classList.remove("is-grabbing"); startX = null;
    });
    $$(".dish__img, .dish__g", stage).forEach(function (img) { img.setAttribute("draggable", "false"); });

    // Reveal-on-scroll: the static markup ships with the first slide
    // already `is-active` (so it's visible immediately with no JS/no
    // IntersectionObserver), but that means its entrance transition has
    // nothing to animate FROM — it's just present from first paint. So
    // with JS running, strip that class right away and only play the
    // choreographed entrance (ghost fade+scale, dish scale-up, garnish
    // stagger, info slide-up — all keyed off .dish.is-active in CSS)
    // once the section actually scrolls into view. One-shot, matching
    // the .reveal convention used elsewhere on the site. Under reduced
    // motion, skip this entirely and leave the slide shown immediately,
    // same as how .reveal behaves there.
    var section = document.getElementById("dishes");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (section && !reduceMotion && "IntersectionObserver" in window) {
      var startSlide = slides[current];
      startSlide.classList.remove("is-active");
      startSlide.setAttribute("aria-hidden", "true");
      var revealOnScroll = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          startSlide.classList.add("is-active");
          startSlide.setAttribute("aria-hidden", "false");
          revealOnScroll.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      revealOnScroll.observe(section);
    }
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    $("#year").textContent = new Date().getFullYear();

    // Demo mode already has contentOverrides from localStorage, so apply
    // it before anything reads the DOM it touches (esp. the hero video's
    // data-mp4/data-webm, which initHeroVideo only reads once at call time).
    applyContentToPage();
    initHeroVideo();
    initInstaVideos();
    initEmberParallax();
    initNavScrollState();
    initThemeToggle();
    initReviewsCarousel();
    initDishSlider();
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      initCursorSpotlight();
      initHeroParallax();
      initReviewTilt();
    }
    // Detect the backend. If present, use it (and load the live menu +
    // existing staff session); otherwise stay in the localStorage demo.
    detectApi().then(function (ok) {
      apiMode = ok;
      if (!apiMode) return;
      return apiReq("GET", "/auth").then(function (d) { unlocked = !!(d && d.authenticated); }).catch(function () {})
        .then(loadMenu).then(loadContent).then(function () {
          renderMenuFilters(); renderMenu();
          applyContentToPage();
          initHeroVideo(); // re-run: safe/idempotent, picks up a content override that arrived after the first (instant, un-overridden) call
          if (!reduceMotion) initScrollReveal();
        });
    }).catch(function () {});

    renderMenuFilters();
    renderMenu();
    if (!reduceMotion) initScrollReveal();
    fillReservationOptions();
    fillCategorySelect();
    renderOpenStatus();
    setInterval(renderOpenStatus, 60000);

    var rForm = $("#reserve-form");
    if (rForm) rForm.addEventListener("submit", handleReserveSubmit);

    $("#staff-login-btn").addEventListener("click", openPortal);
    $("#portal-login-form").addEventListener("submit", handleLogin);
    $("#portal-lock").addEventListener("click", function () { unlocked = false; if (apiMode) apiReq("POST", "/staff/logout").catch(function () {}); closePortal(); toast("Locked", "Staff portal locked."); });
    $$("[data-portal-close]").forEach(function (el) { el.addEventListener("click", closePortal); });
    initTabs();

    $("#menu-add-btn").addEventListener("click", function () { openItemModal(null); });
    $("#item-form").addEventListener("submit", saveItem);
    $("#item-cancel").addEventListener("click", closeItemModal);
    $("#item-cancel-2").addEventListener("click", closeItemModal);
    $("#item-scrim").addEventListener("click", closeItemModal);

    $("#item-image-upload-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      uploadMediaFile(file).then(function (media) {
        $("#item-image").value = media.url;
        toast("Uploaded", file.name, "success");
      }).catch(apiErr);
      e.target.value = "";
    });
    $("#content-save-btn").addEventListener("click", saveAllContent);
    $("#content-reset-all-btn").addEventListener("click", resetAllContent);
    $("#media-upload-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      uploadMediaFile(file).then(function (media) { toast("Uploaded", media.filename, "success"); }).catch(apiErr);
      e.target.value = "";
    });

    // Mobile hamburger nav
    var navToggle = $("#nav-toggle");
    var navMobile = $("#nav-mobile");
    function closeNav() { if (navToggle) navToggle.setAttribute("aria-expanded", "false"); if (navMobile) navMobile.hidden = true; }
    if (navToggle && navMobile) {
      navToggle.addEventListener("click", function () {
        var open = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!open));
        navMobile.hidden = open;
      });
      $$("a", navMobile).forEach(function (a) { a.addEventListener("click", closeNav); });
    }

    document.addEventListener("keydown", function (e) {
      var modalOpen = !$("#item-modal").hidden;
      var portalOpen = !$("#portal").hidden;
      if (e.key === "Escape") {
        if (modalOpen) closeItemModal();
        else if (portalOpen) closePortal();
        else if (navToggle && navToggle.getAttribute("aria-expanded") === "true") closeNav();
        return;
      }
      if (e.key === "Tab") {
        if (modalOpen) trapTab($(".modal__panel"), e);
        else if (portalOpen) trapTab($(".portal__panel"), e);
      }
    });

    // trigger the single, orchestrated hero page-load reveal
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add("is-loaded"); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
