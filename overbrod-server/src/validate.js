import { z } from "zod";

const CATEGORIES = [
  "Smørrebrød",
  "Hot Mains & Platters",
  "Sides",
  "Pastries & Desserts",
  "Beverages",
];
const DIET = ["Vegan", "Halal-friendly", "Nut-free", "Gluten-free"];

// Booking: strict, trimmed, length-capped. Date must be today or later.
export const bookingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(3).max(30).regex(/^[0-9 +()\-]+$/, "Invalid phone"),
  party: z.coerce.number().int().min(1).max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").refine((d) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day) >= today;
  }, "Date is in the past"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  notes: z.string().trim().max(500).optional().default(""),
});

export const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

// Accepted image/media sources: absolute http(s) URLs, inline data URIs, or
// our own uploaded-media path. Same allowlist the client's SAFE_IMG mirrors.
const SAFE_MEDIA_SRC = /^(https?:\/\/|data:image\/|\/uploads\/)/i;

export const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0).max(100000),
  category: z.enum(CATEGORIES),
  image: z.string().trim().max(2000).optional().default("").refine(
    (v) => v === "" || SAFE_MEDIA_SRC.test(v),
    "Unsafe image URL"
  ),
  description: z.string().trim().max(500).optional().default(""),
  signature: z.coerce.boolean().optional().default(false),
  available: z.coerce.boolean().optional().default(true),
  addOn: z.coerce.boolean().optional().default(false),
  diet: z.array(z.enum(DIET)).max(4).optional().default([]),
});

// Content keys are a closed, dotted-lowercase namespace (see CMS_FIELDS on
// the client) — constrained here too so the DB can't accumulate arbitrary
// junk keys from a malformed request.
const CONTENT_KEY = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;

export const contentSchema = z.object({
  entries: z.record(
    z.string().regex(CONTENT_KEY, "Invalid content key"),
    z.string().max(20000)
  ).refine((e) => Object.keys(e).length > 0 && Object.keys(e).length <= 200, "Too many entries"),
});

export { CATEGORIES, DIET, SAFE_MEDIA_SRC };
