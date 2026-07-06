import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { mkdirSync, unlink } from "node:fs";

import db, { stmts, menuRow } from "./db.js";
import { seedMenuIfEmpty } from "./seed.js";
import { bookingSchema, loginSchema, statusSchema, menuItemSchema, contentSchema } from "./validate.js";
import { sendBookingEmails } from "./email.js";
import { loginHandler, logoutHandler, requireAuth, authStatus } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// PDPA data-minimisation: a booking is only kept until N days *after the
// reservation date it was for*, not N days after it was submitted.
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 7);

const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, "..", "data", "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_UPLOAD_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    // Random on-disk name — never trust/reuse the client-supplied filename
    // for the actual path (avoids traversal + collisions); the original
    // name is kept only as display metadata in the `media` table.
    filename: (_req, file, cb) => cb(null, randomUUID() + extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const okType = /^(image|video)\//.test(file.mimetype);
    cb(null, okType && ALLOWED_UPLOAD_EXT.has(ext));
  },
});

export function createApp() {
  seedMenuIfEmpty();
  const app = express();
  app.set("trust proxy", 1); // behind a reverse proxy / TLS terminator in prod

  // Security headers. CSP mirrors the static site's policy; connect-src 'self'
  // lets the page call this same-origin API. The one inline script in
  // index.html (the theme-bootstrap, sets [data-theme] before first paint)
  // is allowed only by its exact sha256 hash — keep this in sync with the
  // hash in index.html's own <meta http-equiv="Content-Security-Policy">;
  // if that script's contents ever change, recompute the hash for both.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'sha256-IHKuDISSeRlljypEvY9WBRzcnXoByiwQkVyYlNAotmg='"],
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

  // ---- content (site copy overrides) ----
  // Public read so the live site can apply staff-edited copy; writes are
  // staff-only. A missing key just means "use the page's hardcoded default".
  api.get("/content", (_req, res) => {
    const entries = {};
    for (const row of stmts.listContent.all()) entries[row.key] = row.value;
    res.json({ entries });
  });
  api.put("/staff/content", requireAuth, (req, res) => {
    const p = contentSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid content", details: p.error.flatten().fieldErrors });
    const now = new Date().toISOString();
    const tx = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        stmts.upsertContent.run({ key, value, updated_at: now });
      }
    });
    tx(p.data.entries);
    res.json({ ok: true });
  });
  // "Reset all" in the Content tab — wipes every override back to the
  // page's hardcoded defaults. Declared before the :key route below;
  // Express matches this exact path first regardless of order since /:key
  // requires a trailing segment, but keeping the bulk route first reads
  // clearer next to the bulk PUT above.
  api.delete("/staff/content", requireAuth, (_req, res) => {
    stmts.deleteAllContent.run();
    res.json({ ok: true });
  });
  api.delete("/staff/content/:key", requireAuth, (req, res) => {
    stmts.deleteContent.run(req.params.key);
    res.json({ ok: true });
  });

  // ---- media library (uploaded images/video for content + menu) ----
  api.get("/staff/media", requireAuth, (_req, res) => {
    res.json({ media: stmts.listMedia.all() });
  });
  api.post("/staff/media", requireAuth, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ error: "Unsupported file type" });
      const row = {
        id: randomUUID(),
        filename: req.file.originalname.slice(0, 200),
        url: "/uploads/" + req.file.filename,
        mime: req.file.mimetype,
        size: req.file.size,
        created_at: new Date().toISOString(),
      };
      stmts.insertMedia.run(row);
      res.status(201).json(row);
    });
  });
  api.delete("/staff/media/:id", requireAuth, (req, res) => {
    const row = stmts.getMedia.get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    stmts.deleteMedia.run(req.params.id);
    const diskPath = join(UPLOADS_DIR, row.url.replace(/^\/uploads\//, ""));
    unlink(diskPath, () => {}); // best-effort; row is already gone either way
    res.json({ ok: true });
  });

  app.use("/api", api);

  // Uploaded media, served same-origin (public read — these are images/video
  // that appear on the public site once assigned to a content field or menu
  // item). Writes only happen via the authed /api/staff/media route above.
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Serve the static site same-origin (so the frontend calls /api/* directly).
  const SITE_DIR = process.env.SITE_DIR || join(__dirname, "..", "..", "site");
  app.use(express.static(SITE_DIR, { extensions: ["html"] }));

  // JSON 404 for unknown API routes
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Retention purge on boot + daily. Cutoff is a plain 'YYYY-MM-DD' string
  // (matching the `date` column format) so the comparison in purgeOld is an
  // exact date comparison, not a date-vs-timestamp mismatch.
  const purge = () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
    stmts.purgeOld.run(cutoff);
  };
  purge();
  setInterval(purge, 24 * 60 * 60 * 1000).unref();

  return app;
}
