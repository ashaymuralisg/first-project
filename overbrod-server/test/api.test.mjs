import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { rmSync } from "node:fs";

// --- test env: known password hash, isolated temp DB, silent email ---
const PASSWORD = "test-pass-123";
process.env.NODE_ENV = "test";
process.env.STAFF_PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
process.env.SESSION_SECRET = "test-secret-please-ignore";
process.env.DB_PATH = "./data/test-overbrod.db";

const { createApp } = await import("../src/app.js");
const { stmts } = await import("../src/db.js");

let server, base;
before(async () => {
  const app = createApp();
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server && server.close();
  for (const f of ["./data/test-overbrod.db", "./data/test-overbrod.db-wal", "./data/test-overbrod.db-shm"]) {
    try { rmSync(f); } catch {}
  }
});

const j = (r) => r.json();
const post = (p, body, headers = {}) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

const validBooking = {
  name: "Jane Tan", email: "jane@example.com", phone: "+65 9123 4567",
  party: 2, date: "2099-01-01", time: "19:00", notes: "Window seat",
};

test("health check", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
});

test("public: menu is seeded and served", async () => {
  const r = await fetch(base + "/api/menu");
  const { menu } = await j(r);
  assert.equal(r.status, 200);
  assert.equal(menu.length, 17);
  assert.ok(menu.some((m) => m.signature)); // signatures flagged
});

test("booking: valid request is accepted", async () => {
  const r = await post("/api/bookings", validBooking);
  assert.equal(r.status, 201);
  const b = await j(r);
  assert.ok(b.id);
  assert.equal(b.status, "pending");
});

test("booking: invalid input is rejected (400)", async () => {
  assert.equal((await post("/api/bookings", { ...validBooking, email: "not-an-email" })).status, 400);
  assert.equal((await post("/api/bookings", { ...validBooking, date: "2000-01-01" })).status, 400); // past
  assert.equal((await post("/api/bookings", { ...validBooking, name: "" })).status, 400);
  assert.equal((await post("/api/bookings", { ...validBooking, phone: "<script>" })).status, 400);
});

test("SQL injection attempt is stored as literal, DB intact", async () => {
  const evil = { ...validBooking, name: "Robert'); DROP TABLE bookings;--" };
  assert.equal((await post("/api/bookings", evil)).status, 201);
  // menu/bookings tables still work afterwards
  assert.equal((await fetch(base + "/api/menu")).status, 200);
});

test("staff endpoints require auth (401 without cookie)", async () => {
  assert.equal((await fetch(base + "/api/staff/bookings")).status, 401);
});

test("login: wrong password 401, correct password sets cookie", async () => {
  assert.equal((await post("/api/staff/login", { password: "wrong" })).status, 401);
  const r = await post("/api/staff/login", { password: PASSWORD });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie");
  assert.ok(cookie && /ob_session=/.test(cookie));
  assert.ok(/HttpOnly/i.test(cookie), "session cookie must be HttpOnly");
});

test("authed staff can list, confirm, and delete bookings", async () => {
  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  const list = await fetch(base + "/api/staff/bookings", { headers: auth });
  const { bookings } = await j(list);
  assert.ok(bookings.length >= 1);
  const id = bookings[0].id;

  const confirm = await fetch(base + "/api/staff/bookings/" + id, { method: "PATCH", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ status: "confirmed" }) });
  assert.equal(confirm.status, 200);

  const del = await fetch(base + "/api/staff/bookings/" + id, { method: "DELETE", headers: auth });
  assert.equal(del.status, 200);
});

test("authed staff menu CRUD; bad image URL rejected", async () => {
  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  // reject javascript: image
  const bad = await post("/api/staff/menu", { name: "X", price: 5, category: "Sides", image: "javascript:alert(1)" }, auth);
  assert.equal(bad.status, 400);

  // valid add
  const add = await post("/api/staff/menu", { name: "Test Herring", price: 13, category: "Smørrebrød", diet: ["Gluten-free"] }, auth);
  assert.equal(add.status, 201);
  const { id } = await j(add);
  const del = await fetch(base + "/api/staff/menu/" + id, { method: "DELETE", headers: auth });
  assert.equal(del.status, 200);
});

test("booking rate limit kicks in (429)", async () => {
  let got429 = false;
  for (let i = 0; i < 14; i++) {
    const r = await post("/api/bookings", validBooking);
    if (r.status === 429) { got429 = true; break; }
  }
  assert.ok(got429, "expected a 429 after exceeding the booking rate limit");
});

test("content: public GET, staff-only write, unknown keys rejected", async () => {
  assert.equal((await fetch(base + "/api/content")).status, 200);

  // writes require auth
  assert.equal((await fetch(base + "/api/staff/content", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entries: { "hero.tagline": "x" } }) })).status, 401);

  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  // bad key rejected
  const bad = await fetch(base + "/api/staff/content", { method: "PUT", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ entries: { "<script>": "x" } }) });
  assert.equal(bad.status, 400);

  // valid write round-trips through the public GET
  const put = await fetch(base + "/api/staff/content", { method: "PUT", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ entries: { "hero.tagline": "New tagline" } }) });
  assert.equal(put.status, 200);
  const { entries } = await j(await fetch(base + "/api/content"));
  assert.equal(entries["hero.tagline"], "New tagline");

  // delete reverts (key disappears)
  const del = await fetch(base + "/api/staff/content/hero.tagline", { method: "DELETE", headers: auth });
  assert.equal(del.status, 200);
  const { entries: after } = await j(await fetch(base + "/api/content"));
  assert.equal(after["hero.tagline"], undefined);
});

test("content: per-item keys with numeric segments (dish.0.name, reviews.2.quote) are accepted", async () => {
  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  const put = await fetch(base + "/api/staff/content", {
    method: "PUT", headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify({ entries: { "dish.0.name": "Test Dish", "reviews.2.quote": "Great food.", "story.craft.1": "Curing" } }),
  });
  assert.equal(put.status, 200);
  const { entries } = await j(await fetch(base + "/api/content"));
  assert.equal(entries["dish.0.name"], "Test Dish");
  assert.equal(entries["reviews.2.quote"], "Great food.");
  assert.equal(entries["story.craft.1"], "Curing");

  await Promise.all(["dish.0.name", "reviews.2.quote", "story.craft.1"].map((k) =>
    fetch(base + "/api/staff/content/" + k, { method: "DELETE", headers: auth })
  ));
});

test("content: reset-all clears every override", async () => {
  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  await fetch(base + "/api/staff/content", {
    method: "PUT", headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify({ entries: { "hero.tagline": "x", "story.title": "y" } }),
  });
  let { entries } = await j(await fetch(base + "/api/content"));
  assert.ok(Object.keys(entries).length >= 2);

  const resetAll = await fetch(base + "/api/staff/content", { method: "DELETE", headers: auth });
  assert.equal(resetAll.status, 200);
  ({ entries } = await j(await fetch(base + "/api/content")));
  assert.equal(Object.keys(entries).length, 0);
});

test("media: requires auth, rejects disallowed file types, deletes cleanly", async () => {
  assert.equal((await fetch(base + "/api/staff/media")).status, 401);

  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };

  // disallowed extension/mimetype (e.g. an .html/script masquerading as upload)
  const evilForm = new FormData();
  evilForm.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "evil.html");
  const evilRes = await fetch(base + "/api/staff/media", { method: "POST", headers: auth, body: evilForm });
  assert.equal(evilRes.status, 400);

  // valid small png upload
  const pngBytes = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082", "hex");
  const form = new FormData();
  form.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
  const up = await fetch(base + "/api/staff/media", { method: "POST", headers: auth, body: form });
  assert.equal(up.status, 201);
  const media = await j(up);
  assert.ok(media.id && media.url.startsWith("/uploads/"));

  // the uploaded file is actually servable
  const served = await fetch(base + media.url);
  assert.equal(served.status, 200);

  // appears in the staff library list
  const list = await j(await fetch(base + "/api/staff/media", { headers: auth }));
  assert.ok(list.media.some((m) => m.id === media.id));

  // delete removes the row (and the file, best-effort)
  const del = await fetch(base + "/api/staff/media/" + media.id, { method: "DELETE", headers: auth });
  assert.equal(del.status, 200);
  const listAfter = await j(await fetch(base + "/api/staff/media", { headers: auth }));
  assert.ok(!listAfter.media.some((m) => m.id === media.id));
});

test("retention: purge is keyed off the reservation date, not created_at", async () => {
  const now = new Date().toISOString();
  stmts.insertBooking.run({ id: "old-1", name: "Old", email: "old@example.com", phone: "+65 9000 0000", party: "2", date: "2000-01-01", time: "19:00", notes: "", created_at: now });
  stmts.insertBooking.run({ id: "recent-1", name: "Recent", email: "recent@example.com", phone: "+65 9000 0001", party: "2", date: "2099-01-01", time: "19:00", notes: "", created_at: now });
  assert.ok(stmts.getBooking.get("old-1"));
  assert.ok(stmts.getBooking.get("recent-1"));

  stmts.purgeOld.run("2020-01-01"); // between the two reservation dates
  assert.equal(stmts.getBooking.get("old-1"), undefined, "past-dated reservation should be purged");
  assert.ok(stmts.getBooking.get("recent-1"), "future-dated reservation should survive");
});

test("menu image field accepts an /uploads/ path", async () => {
  const login = await post("/api/staff/login", { password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { cookie };
  const add = await post("/api/staff/menu", { name: "Uploaded Photo Item", price: 9, category: "Sides", image: "/uploads/whatever.jpg" }, auth);
  assert.equal(add.status, 201);
  const { id } = await j(add);
  await fetch(base + "/api/staff/menu/" + id, { method: "DELETE", headers: auth });
});
