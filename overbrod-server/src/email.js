import nodemailer from "nodemailer";

const DELI_EMAIL = process.env.DELI_EMAIL || "overbrodsg@gmail.com";
const FROM = process.env.MAIL_FROM || `OVERBRØD <${DELI_EMAIL}>`;

// Real SMTP when configured; otherwise a JSON transport that just captures the
// message (so dev/test never fails and never sends). Configure SMTP_* in prod.
let transport;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
} else {
  transport = nodemailer.createTransport({ jsonTransport: true });
  if (process.env.NODE_ENV !== "test") {
    console.warn("[email] No SMTP_HOST set — emails are logged, not sent. Configure SMTP_* for production.");
  }
}

function fmt(b) {
  return [
    `Name:   ${b.name}`,
    `Date:   ${b.date}`,
    `Time:   ${b.time}`,
    `Guests: ${b.party}`,
    `Phone:  ${b.phone}`,
    `Email:  ${b.email}`,
    `Notes:  ${b.notes || "—"}`,
  ].join("\n");
}

/**
 * Send the customer acknowledgement + the deli notification.
 * Never throws — email failure must not fail the booking.
 */
export async function sendBookingEmails(b) {
  const results = {};
  try {
    results.customer = await transport.sendMail({
      from: FROM,
      to: b.email,
      subject: "We've received your OVERBRØD table request",
      text: `Hi ${b.name.split(" ")[0]},\n\nThanks — we've received your request for ${b.date} at ${b.time} for ${b.party}. We'll confirm shortly by phone or email.\n\n${fmt(b)}\n\nOVERBRØD · 370 Alexandra Rd, #01-14A, Singapore 159953`,
    });
    results.deli = await transport.sendMail({
      from: FROM,
      to: DELI_EMAIL,
      replyTo: b.email,
      subject: `New table request — ${b.name} — ${b.date} ${b.time}`,
      text: `New reservation request from the website:\n\n${fmt(b)}`,
    });
  } catch (err) {
    console.error("[email] send failed:", err && err.message);
    results.error = err && err.message;
  }
  return results;
}

export const mailTransport = transport;
