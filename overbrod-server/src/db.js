import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/overbrod.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT NOT NULL,
    party      TEXT NOT NULL,
    date       TEXT NOT NULL,
    time       TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menu (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    category    TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    signature   INTEGER NOT NULL DEFAULT 0,
    available   INTEGER NOT NULL DEFAULT 1,
    add_on      INTEGER NOT NULL DEFAULT 0,
    diet        TEXT NOT NULL DEFAULT '[]',
    sort        INTEGER NOT NULL DEFAULT 0
  );
`);

/* ---------- prepared statements (all parameterized) ---------- */
export const stmts = {
  insertBooking: db.prepare(`
    INSERT INTO bookings (id, name, email, phone, party, date, time, notes, status, created_at)
    VALUES (@id, @name, @email, @phone, @party, @date, @time, @notes, 'pending', @created_at)
  `),
  listBookings: db.prepare(`SELECT * FROM bookings ORDER BY date, time`),
  listBookingsByStatus: db.prepare(`SELECT * FROM bookings WHERE status = ? ORDER BY date, time`),
  getBooking: db.prepare(`SELECT * FROM bookings WHERE id = ?`),
  setBookingStatus: db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`),
  deleteBooking: db.prepare(`DELETE FROM bookings WHERE id = ?`),
  purgeOld: db.prepare(`DELETE FROM bookings WHERE created_at < ?`),

  listMenu: db.prepare(`SELECT * FROM menu ORDER BY sort, rowid`),
  getMenuItem: db.prepare(`SELECT * FROM menu WHERE id = ?`),
  insertMenu: db.prepare(`
    INSERT INTO menu (id, name, price, category, image, description, signature, available, add_on, diet, sort)
    VALUES (@id, @name, @price, @category, @image, @description, @signature, @available, @add_on, @diet, @sort)
  `),
  updateMenu: db.prepare(`
    UPDATE menu SET name=@name, price=@price, category=@category, image=@image,
      description=@description, signature=@signature, available=@available,
      add_on=@add_on, diet=@diet WHERE id=@id
  `),
  deleteMenu: db.prepare(`DELETE FROM menu WHERE id = ?`),
  countMenu: db.prepare(`SELECT COUNT(*) AS n FROM menu`),
};

/** Row → API shape for menu (parse JSON diet, cast booleans). */
export function menuRow(r) {
  return {
    id: r.id, name: r.name, price: r.price, category: r.category,
    image: r.image, description: r.description,
    signature: !!r.signature, available: !!r.available, addOn: !!r.add_on,
    diet: JSON.parse(r.diet || "[]"),
  };
}

export default db;
