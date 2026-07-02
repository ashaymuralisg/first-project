import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { stmts, menuRow } from "./db.js";
import { seedMenuIfEmpty } from "./seed.js";
import { bookingSchema, loginSchema, statusSchema, menuItemSchema } from "./validate.js";
import { sendBookingEmails } from "./email.js";
import { loginHandler, logoutHandler, requireAuth, authStatus } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 60);

export function createApp() {
  seedMenuIfEmpty();
  const app = express();
  app.set("trust proxy", 1); // behind a reverse proxy / TLS terminator in prod

  // Security headers. CSP mirrors the static site's policy; connect-src 'self'
  // lets the page call this same-origin API.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          mediaSrc: ["'self'"],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          baseUri: ["'none'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());

  const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests, please try again later." } });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts, please try again later." } });

  const api = express.Router();

  api.get("/health", (_req, res) => res.json({ ok: true }));
  api.get("/auth", authStatus);
  api.post("/staff/login", loginLimiter, (req, res, next) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid request" });
    req.body = p.data;
    return loginHandler(req, res).catch(next);
  });
  api.post("/staff/logout", logoutHandler);

  // ---- public: menu (read) + bookings (create) ----
  api.get("/menu", (_req, res) => {
    res.json({ menu: stmts.listMenu.all().map(menuRow) });
  });

  api.post("/bookings", bookingLimiter, async (req, res) => {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check your details.", details: parsed.error.flatten().fieldErrors });
    }
    const b = parsed.data;
    const row = {
      id: randomUUID(),
      name: b.name, email: b.email, phone: b.phone,
      party: String(b.party), date: b.date, time: b.time, notes: b.notes || "",
      created_at: new Date().toISOString(),
    };
    stmts.insertBooking.run(row);
    // Fire emails but don't block the response on delivery.
    sendBookingEmails(b).catch(() => {});
    res.status(201).json({ id: row.id, status: "pending" });
  });

  // ---- staff: bookings management ----
  api.get("/staff/bookings", requireAuth, (req, res) => {
    const s = req.query.status;
    const rows = s && ["pending", "confirmed", "cancelled"].includes(s)
      ? stmts.listBookingsByStatus.all(s)
      : stmts.listBookings.all();
    res.json({ bookings: rows });
  });
  api.patch("/staff/bookings/:id", requireAuth, (req, res) => {
    const p = statusSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid status" });
    if (!stmts.getBooking.get(req.params.id)) return res.status(404).json({ error: "Not found" });
    stmts.setBookingStatus.run(p.data.status, req.params.id);
    res.json({ ok: true });
  });
  api.delete("/staff/bookings/:id", requireAuth, (req, res) => {
    stmts.deleteBooking.run(req.params.id);
    res.json({ ok: true });
  });

  // ---- staff: menu management ----
  api.post("/staff/menu", requireAuth, (req, res) => {
    const p = menuItemSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid item", details: p.error.flatten().fieldErrors });
    const d = p.data;
    const id = randomUUID();
    const n = stmts.listMenu.all().length;
    stmts.insertMenu.run({ id, name: d.name, price: d.price, category: d.category, image: d.image, description: d.description, signature: d.signature ? 1 : 0, available: d.available ? 1 : 0, add_on: d.addOn ? 1 : 0, diet: JSON.stringify(d.diet), sort: n });
    res.status(201).json({ id });
  });
  api.patch("/staff/menu/:id", requireAuth, (req, res) => {
    if (!stmts.getMenuItem.get(req.params.id)) return res.status(404).json({ error: "Not found" });
    const p = menuItemSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid item", details: p.error.flatten().fieldErrors });
    const d = p.data;
    stmts.updateMenu.run({ id: req.params.id, name: d.name, price: d.price, category: d.category, image: d.image, description: d.description, signature: d.signature ? 1 : 0, available: d.available ? 1 : 0, add_on: d.addOn ? 1 : 0, diet: JSON.stringify(d.diet) });
    res.json({ ok: true });
  });
  api.delete("/staff/menu/:id", requireAuth, (req, res) => {
    stmts.deleteMenu.run(req.params.id);
    res.json({ ok: true });
  });

  app.use("/api", api);

  // Serve the static site same-origin (so the frontend calls /api/* directly).
  const SITE_DIR = process.env.SITE_DIR || join(__dirname, "..", "..", "site");
  app.use(express.static(SITE_DIR, { extensions: ["html"] }));

  // JSON 404 for unknown API routes
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Retention purge on boot + daily
  const purge = () => stmts.purgeOld.run(new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString());
  purge();
  setInterval(purge, 24 * 60 * 60 * 1000).unref();

  return app;
}
