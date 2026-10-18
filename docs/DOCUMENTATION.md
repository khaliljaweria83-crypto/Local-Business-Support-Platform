# LocalBiz — Project Documentation

| | |
|---|---|
| **Project title** | LocalBiz — Local Business Support Platform |
| **Project code** | BSIT22-G3 |
| **Team** | Yasir Mehmood (076984), Hafiz Bilal Khalil (077018) |
| **Advisor** | Prof. Imran Shafique |
| **Institute** | Govt. Graduate Islamia College, Gujranwala (2022–2026) |

---

## 1. Introduction

Small and local businesses in Pakistan often have no online presence, and customers find it hard to discover trustworthy nearby shops and services. **LocalBiz** is a web platform that connects local businesses with customers. Owners list their businesses, an administrator verifies each listing, and customers can search, call, review and report businesses.

## 2. Problem Statement

- Local businesses lack a simple, free way to be found online.
- Customers cannot easily tell whether a listing is genuine.
- Fake listings and abusive reviews need a moderation mechanism.

## 3. Objectives

1. Provide a searchable directory of local businesses by name, category and city.
2. Let owners create and manage listings and promotions.
3. Ensure quality through admin approval, with written reasons for every decision.
4. Let customers review businesses and report fake/abusive content.
5. Keep the system secure (authentication, hashed passwords, OTP, rate limiting).

## 4. Scope

**In scope:** user registration/login with email OTP, business listing and approval workflow, search and filters, map view, reviews and ratings, promotions, reporting, admin dashboard and activity log.
**Out of scope:** online payments, delivery/booking, native mobile apps.

## 5. User Roles

| Role | What they can do |
|------|------------------|
| **Customer** | Search, view details and map, call, write/delete own review, report business or review, see report decisions in profile |
| **Owner** | Everything a customer can, plus add/edit/delete businesses, upload photo, create promotions, see admin notes |
| **Admin** | Approve/reject/suspend businesses, block/unblock users, resolve/dismiss reports, view stats and activity log |

## 6. System Architecture

Three-tier web application:

```
React (Vite, port 3000)  --HTTP/JSON-->  Express API (port 5000)  --SQL-->  MySQL (localbiz)
```

- **Frontend** calls the backend through `frontend/src/api.js`.
- **Backend** flow: `routes/` → `middleware/` (JWT auth, rate limiter, upload) → `controllers/` → `config/db.js`.
- **Services:** `emailService.js` (Nodemailer) and `geocodeService.js` (address → coordinates for the map).

## 7. Technology Stack

React 18, Vite, React Router, Leaflet / React-Leaflet, lucide-react · Node.js, Express · MySQL (mysql2) · JWT, bcryptjs · Multer · Nodemailer.

## 8. Database Design

Database: `localbiz` (utf8mb4). Schema file: `backend/database/localbiz.sql`.

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | All accounts | full_name, email (unique), password (bcrypt), user_type (customer/owner/admin), phone, status (active/blocked) |
| `email_otps` | OTPs for signup & password reset | email, purpose, otp_hash, attempts, verified, expires_at |
| `businesses` | Business listings | owner_id → users, name, category, city, address, phone, description, hours, latitude, longitude, photo_url, status (pending/active/rejected/suspended), approval_note, rejection_reason, average_rating |
| `reviews` | Ratings and comments | user_id, business_id, rating (1–5), comment, status; one review per user per business |
| `promotions` | Offers by owners | business_id, title, description, start_date, end_date, is_active |
| `reports` | Complaints about businesses/reviews | user_id, business_id, review_id, type, reason, status (pending/reviewed/dismissed), admin_response |
| `admin_logs` | Audit trail | admin_id, action, target_id, target_type, notes |

Relationships: a user owns many businesses; a business has many reviews, promotions and reports; deleting a user/business cascades to dependent rows, while reports survive deleted reviews (`ON DELETE SET NULL`).

## 9. Modules

1. **Authentication** — register with email OTP, login (JWT), forgot/reset password, profile update. Password rule: at least 8 characters, a letter, a number, a special character, no spaces (checked on both frontend and backend).
2. **Business management** — owners add/edit/delete; new listings start as *pending*; geocoding fills map coordinates.
3. **Search & discovery** — filter by keyword, category, city; detail page with map, reviews, promotions and a **CALL** button (`tel:` link).
4. **Reviews & ratings** — one review per user per business; average rating recalculated automatically.
5. **Promotions** — owners publish dated offers; only active ones are shown publicly.
6. **Reports** — users report a business or review (one pending report per target per user); decisions are shown under *My Reports*.
7. **Admin panel** — pending list (newest first), approve/reject/suspend with mandatory written reason (min 5 characters), user blocking, reports tab with status filters, activity log.

## 10. API Reference

Base URL: `http://localhost:5000/api`

**Auth** — `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/profile`, `POST /auth/send-registration-otp`, `POST /auth/verify-otp`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Businesses** — `GET /businesses`, `GET /businesses/my`, `GET /businesses/:id`, `POST /businesses`, `PUT /businesses/:id`, `DELETE /businesses/:id`, `POST /businesses/:id/photo`, `POST /businesses/:id/report`

**Reviews** — `GET /reviews/:businessId`, `POST /reviews/:businessId`, `DELETE /reviews/:id`, `POST /reviews/:id/report`

**Promotions** — `GET /promotions/business/:businessId`, `GET /promotions/mine`, `POST /promotions`, `DELETE /promotions/:id`

**Reports** — `GET /reports/mine`

**Admin** — `GET /admin/stats`, `GET /admin/businesses`, `GET /admin/businesses/pending`, `POST /admin/businesses/:id/{approve|reject|suspend}`, `GET /admin/users`, `POST /admin/users/:id/{block|unblock}`, `GET /admin/reports`, `POST /admin/reports/:id/{dismiss|resolve}`, `GET /admin/logs`

Protected routes need the header `Authorization: Bearer <token>`.

## 11. Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page | Public |
| `/search` | Search & filter | Public |
| `/business/:id` | Business detail | Public |
| `/login`, `/register`, `/reset-password` | Authentication | Public |
| `/about`, `/contact`, `/terms`, `/privacy` | Information pages | Public |
| `/profile` | Profile & My Reports | Logged-in |
| `/owner` | Owner dashboard | Owner |
| `/admin` | Admin dashboard | Admin |

## 12. Security Measures

- Passwords hashed with bcrypt; sessions via signed JWT.
- OTPs generated with `crypto.randomInt`, stored hashed, limited attempts, expiry time.
- Rate limiter on authentication routes (30 requests / 15 minutes).
- All SQL queries are parameterized (protection against SQL injection).
- Uploads restricted to JPG / PNG / WEBP.
- Non-active listings are visible only to their owner and admin.
- Emails are HTML-escaped; `.env` secrets are excluded from Git.

## 13. Installation & Setup

See the **How to Run Locally** section in the root [`README.md`](../README.md). In short: import `localbiz.sql` in phpMyAdmin → `cd backend && npm install && npm run dev` → `cd frontend && npm install && npm run dev`.

## 14. Testing — Sample Scenarios

| # | Scenario | Expected result |
|---|----------|-----------------|
| 1 | Register with weak password | Rejected with checklist message |
| 2 | Register with valid details + OTP | Account created, login works |
| 3 | Owner adds a business | Status *pending*, not visible publicly |
| 4 | Admin approves with note | Business becomes *active* and searchable; owner sees the note |
| 5 | Admin rejects without reason | Blocked — reason is mandatory |
| 6 | Customer submits second review for same business | Rejected (one review per user) |
| 7 | Customer reports a business twice | Second report blocked while first is pending |
| 8 | Admin blocks a user | User cannot log in |
| 9 | Click CALL on detail page | Phone dialer / Phone Link opens with the number |

## 15. Limitations & Future Work

- No online payment or booking.
- Email requires Gmail App Password configuration.
- Future: mobile app, business analytics for owners, multi-language (Urdu) interface, WhatsApp contact button, deployment on a cloud host.

## 16. Conclusion

LocalBiz gives small local businesses an online presence and gives customers a trustworthy, moderated place to discover them. The admin approval workflow, mandatory written decisions and the activity log keep the platform accountable and secure.
