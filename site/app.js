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
  function money(n) { return "$" + (Math.round(Number(n) * 100) / 100).toFixed(Number(n) % 1 === 0 ? 0 : 2); }

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
  var unlocked = false;
  var activeDietFilter = "All";
  var activeBookingFilter = "All";
  var lastFocused = null;

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
      root.innerHTML = '<p class="menu__empty">No dishes match that filter right now — try “All”.</p>';
      return;
    }

    var html = "";
    CATEGORIES.forEach(function (cat) {
      var group = items.filter(function (m) { return m.category === cat; });
      if (!group.length) return;
      html += '<div class="menu__group reveal"><h3 class="menu__group-title">' + esc(cat) +
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
          (m.signature ? '<span class="sig-flag">Signature</span> ' : "") + esc(m.name) + "</div>" +
          (m.description ? '<p class="menu-item__desc">' + esc(m.description) + "</p>" : "") +
          (tags ? '<div class="menu-item__tags">' + tags + "</div>" : "") +
          '</div><div class="menu-item__price">' + esc(priceLabel) + "</div></article>";
      });
      html += "</div></div>";
    });
    root.innerHTML = html;
    observeReveals(root);
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
      var invalid = !el.value || (el.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));
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
    bookings.push(booking);
    save(BOOKINGS_KEY, bookings);

    form.reset();
    $$("[aria-invalid]", form).forEach(function (el) { el.setAttribute("aria-invalid", "false"); });
    toast("Table requested ✓", "Thanks " + booking.name.split(" ")[0] + " — we've received your request for " + prettyDate(booking.date) + " at " + booking.time + ". We'll confirm shortly.", "success");
    if (unlocked) renderBookings();
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
    renderBookingFilters();
    renderBookings();
    renderCMS();
  }
  function handleLogin(e) {
    e.preventDefault();
    var val = $("#portal-pass").value;
    if (val === STAFF_PASSWORD) {
      unlocked = true;
      $("#portal-err").hidden = true;
      showDash();
    } else {
      $("#portal-err").hidden = false;
      $("#portal-pass").focus();
      $("#portal-pass").select();
    }
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
    b.status = status;
    save(BOOKINGS_KEY, bookings);
    renderBookings();
    toast("Booking " + status, esc(b.name) + " · " + prettyDate(b.date) + " " + b.time, status === "confirmed" ? "success" : null);
  }
  function deleteBooking(id) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    if (!confirm("Delete the booking for " + b.name + " on " + prettyDate(b.date) + "? This cannot be undone.")) return;
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
      html += '<div class="cms__cat">' + esc(cat) + "</div>";
      group.forEach(function (m) {
        html += '<div class="cms-item' + (m.available ? "" : " is-off") + '">' +
          '<div><div class="cms-item__name">' +
          '<span class="dot' + (m.available ? "" : " dot--off") + '" style="background:' + (m.available ? "var(--color-success)" : "") + '"></span>' +
          esc(m.name) +
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
    root.innerHTML = html;
    $$("[data-edit]", root).forEach(function (b) { b.addEventListener("click", function () { openItemModal(b.getAttribute("data-edit")); }); });
    $$("[data-toggle]", root).forEach(function (b) { b.addEventListener("click", function () { toggleAvailable(b.getAttribute("data-toggle")); }); });
    $$("[data-del]", root).forEach(function (b) { b.addEventListener("click", function () { deleteItem(b.getAttribute("data-del")); }); });
  }
  function toggleAvailable(id) {
    var m = menu.find(function (x) { return x.id === id; });
    if (!m) return;
    m.available = !m.available;
    save(MENU_KEY, menu);
    renderCMS(); renderMenu();
  }
  function deleteItem(id) {
    var m = menu.find(function (x) { return x.id === id; });
    if (!m) return;
    if (!confirm('Delete "' + m.name + '" from the menu?')) return;
    menu = menu.filter(function (x) { return x.id !== id; });
    save(MENU_KEY, menu);
    renderCMS(); renderMenu();
    toast("Item deleted", esc(m.name));
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
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () { $("#item-name").focus(); }, 40);
  }
  function closeItemModal() {
    var modal = $("#item-modal");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
  function saveItem(e) {
    e.preventDefault();
    var id = $("#item-id").value;
    var name = $("#item-name").value.trim();
    var price = parseFloat($("#item-price").value);
    if (!name || isNaN(price)) { toast("Missing details", "A name and a valid price are required.", "error"); return; }
    var data = {
      name: name,
      price: price,
      category: $("#item-category").value,
      image: $("#item-image").value.trim(),
      description: $("#item-desc").value.trim(),
      signature: $("#item-signature").checked,
      available: $("#item-available").checked,
      diet: $$("#item-diet input").filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; }),
    };
    if (id) {
      var m = menu.find(function (x) { return x.id === id; });
      if (m) { Object.assign(m, data); }
    } else {
      menu.push(Object.assign({ id: uid() }, data));
    }
    save(MENU_KEY, menu);
    closeItemModal();
    renderCMS(); renderMenu();
    toast(id ? "Item updated" : "Item added", esc(name), "success");
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
     SCROLL REVEAL
     ============================================================ */
  var revealObserver = null;
  function observeReveals(root) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", root || document).forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); revealObserver.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    }
    $$(".reveal:not(.is-in)", root || document).forEach(function (el) { revealObserver.observe(el); });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    $("#year").textContent = new Date().getFullYear();

    renderMenuFilters();
    renderMenu();
    fillReservationOptions();
    fillCategorySelect();
    renderOpenStatus();
    setInterval(renderOpenStatus, 60000);

    var rForm = $("#reserve-form");
    if (rForm) rForm.addEventListener("submit", handleReserveSubmit);

    $("#staff-login-btn").addEventListener("click", openPortal);
    $("#portal-login-form").addEventListener("submit", handleLogin);
    $("#portal-lock").addEventListener("click", function () { unlocked = false; closePortal(); toast("Locked", "Staff portal locked."); });
    $$("[data-portal-close]").forEach(function (el) { el.addEventListener("click", closePortal); });
    initTabs();

    $("#menu-add-btn").addEventListener("click", function () { openItemModal(null); });
    $("#item-form").addEventListener("submit", saveItem);
    $("#item-cancel").addEventListener("click", closeItemModal);
    $("#item-cancel-2").addEventListener("click", closeItemModal);
    $("#item-scrim").addEventListener("click", closeItemModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#item-modal").hidden) closeItemModal();
        else if (!$("#portal").hidden) closePortal();
      }
    });

    // reveal hero bits immediately, observe the rest
    observeReveals(document);
    requestAnimationFrame(function () { $$(".hero .reveal").forEach(function (el) { el.classList.add("is-in"); }); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
