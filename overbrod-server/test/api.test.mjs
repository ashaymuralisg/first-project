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
