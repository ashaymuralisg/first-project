import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const COOKIE = "ob_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8h staff session

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (() => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[auth] No SESSION_SECRET set — using a random one; sessions won't survive restart.");
    }
    return crypto.randomBytes(32).toString("hex");
  })();

// Resolve the staff password hash: prefer a pre-computed bcrypt hash; in dev,
// allow a plaintext STAFF_PASSWORD (hashed at boot). Never ship a default.
let PASSWORD_HASH = process.env.STAFF_PASSWORD_HASH || "";
if (!PASSWORD_HASH && process.env.STAFF_PASSWORD) {
  PASSWORD_HASH = bcrypt.hashSync(process.env.STAFF_PASSWORD, 12);
  if (process.env.NODE_ENV !== "test") {
    console.warn("[auth] Hashing STAFF_PASSWORD at boot (dev). Set STAFF_PASSWORD_HASH in production.");
  }
}

const b64u = (buf) => Buffer.from(buf).toString("base64url");
function sign(payloadStr) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payloadStr).digest("base64url");
}

function makeToken() {
  const payload = b64u(JSON.stringify({ exp: Date.now() + MAX_AGE_MS }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  // constant-time compare
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

const cookieOpts = (req) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production" || req.secure,
  maxAge: MAX_AGE_MS,
  path: "/",
});

export async function loginHandler(req, res) {
  const password = req.body && req.body.password;
  if (!PASSWORD_HASH) {
    return res.status(503).json({ error: "Staff login is not configured." });
  }
  const ok = typeof password === "string" && (await bcrypt.compare(password, PASSWORD_HASH));
  if (!ok) return res.status(401).json({ error: "Incorrect password." });
  res.cookie(COOKIE, makeToken(), cookieOpts(req));
  res.json({ ok: true });
}

export function logoutHandler(req, res) {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
}

export function requireAuth(req, res, next) {
  if (verifyToken(req.cookies && req.cookies[COOKIE])) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

export function authStatus(req, res) {
  res.json({ authenticated: verifyToken(req.cookies && req.cookies[COOKIE]) });
}
