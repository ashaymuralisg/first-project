# overbrod-server

A small, secure backend for the OVERBRØD site: a bookings API with real staff
authentication and email confirmations. It also serves the static site
(`../site`) so the whole thing runs as one origin (no CORS to manage).

- **Node + Express**, **SQLite** (`better-sqlite3`) for storage
- **bcrypt**-hashed staff password, **httpOnly signed-cookie** sessions
- **Rate limiting** on booking + login, **helmet** security headers
- **zod** input validation, **parameterized SQL** (no injection)
- **nodemailer** confirmation emails (customer + deli)

## Run

```bash
cd overbrod-server
npm install
cp .env.example .env          # then fill it in (see below)
npm run hash -- 'your-strong-staff-password'   # prints STAFF_PASSWORD_HASH
# put that hash + a long random SESSION_SECRET into .env
npm start                      # serves site + API on http://HOST:PORT
npm test                       # runs the API test suite
```

Open the served site (e.g. `http://localhost:3000`) — the frontend detects the
API automatically and uses it. Opening `../site/index.html` as a plain file
still works as the offline localStorage demo.

## Configuration (`.env`)

| Var | Purpose |
|-----|---------|
| `STAFF_PASSWORD_HASH` | bcrypt hash from `npm run hash` (**required** for staff login) |
| `SESSION_SECRET` | long random string signing session cookies (**required**) |
| `DB_PATH` | SQLite file location (default `./data/overbrod.db`) |
| `RETENTION_DAYS` | auto-delete bookings older than this (default 60) |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | SMTP for real email; if unset, emails are logged not sent |
| `MAIL_FROM`, `DELI_EMAIL` | sender + where deli notifications go |
| `PORT`, `HOST` | listen address (use `0.0.0.0` behind a proxy) |
| `SITE_DIR` | static site to serve (default `../site`) |

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | – | health check |
| GET | `/api/menu` | – | list menu |
| POST | `/api/bookings` | – (rate-limited) | create booking (validated) → emails |
| POST | `/api/staff/login` | – (rate-limited) | bcrypt check → session cookie |
| POST | `/api/staff/logout` | – | clear session |
| GET | `/api/auth` | – | `{authenticated}` |
| GET | `/api/staff/bookings` | ✅ | list bookings |
| PATCH | `/api/staff/bookings/:id` | ✅ | set status (pending/confirmed/cancelled) |
| DELETE | `/api/staff/bookings/:id` | ✅ | delete booking |
| POST/PATCH/DELETE | `/api/staff/menu[/:id]` | ✅ | menu CRUD |

## Security notes

- Serve over **HTTPS only** in production (the session cookie is marked
  `Secure` when `NODE_ENV=production`); the `_headers`/helmet HSTS assumes TLS.
- `.env` and the `data/` DB are git-ignored — never commit secrets or the DB.
- Sessions use an in-process signing secret; for multiple instances, use a
  shared secret + a shared session/DB store.
- Still owner/lawyer responsibilities (not code): appoint a DPO, publish the
  filled-in privacy policy, verify allergen tags, and have a Singapore lawyer
  review before launch.
