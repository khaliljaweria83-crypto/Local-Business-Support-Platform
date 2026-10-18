# LocalBiz Backend API
## Project: BSIT22-G3 — Local Business Support Platform
**Team:** Yasir Mehmood (076984) & Hafiz Bilal Khalil (077018)
**Advisor:** Prof. Imran Shafique
**College:** Govt. Graduate Islamia College, Gujranwala (2022-2026)

---

## SETUP INSTRUCTIONS — Step by Step

### Step 1 — XAMPP Install aur Start Karo
1. https://www.apachefriends.org se XAMPP download karo
2. Install karo
3. XAMPP Control Panel kholo
4. **Apache** → Start
5. **MySQL** → Start

### Step 2 — Database Banao
1. Browser mein jao: http://localhost/phpmyadmin
2. Left side mein "New" click karo
3. Database name likho: **localbiz**
4. "Create" click karo
5. Upar "Import" tab click karo
6. "Choose File" click karo → **database/localbiz.sql** select karo
7. "Go" click karo
8. ✅ Tables ban jayengi!

### Step 3 — Backend Folder VS Code mein Kholo
```
File → Open Folder → localbiz-backend folder select karo
```

### Step 4 — Terminal mein Commands Chalao
```bash
npm install
npm run dev
```

### Step 5 — Test Karo
Browser mein jao: http://localhost:5000
Yeh message aana chahiye:
```json
{
  "message": "🏪 LocalBiz API is running!"
}
```

---

## API ENDPOINTS

### Auth Routes
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | New user register |
| POST | /api/auth/login | User login |
| GET  | /api/auth/profile | Get profile (token required) |
| PUT  | /api/auth/profile | Update profile (token required) |
| POST | /api/auth/send-registration-otp | Send OTP to verify email at signup |
| POST | /api/auth/verify-otp | Verify an OTP (signup / password reset) |
| POST | /api/auth/forgot-password | Send password-reset OTP |
| POST | /api/auth/reset-password | Set a new password after OTP verification |

### Business Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/businesses | All businesses (search/filter) |
| GET  | /api/businesses/my | Owner's businesses |
| GET  | /api/businesses/:id | Single business |
| POST | /api/businesses | Add business (owner) |
| PUT  | /api/businesses/:id | Update business (owner) |
| DELETE | /api/businesses/:id | Delete business (owner) |
| POST | /api/businesses/:id/photo | Upload live photo (owner) |
| POST | /api/businesses/:id/report | Report a business (logged-in user) |

### Review Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/reviews/:businessId | Get reviews |
| POST | /api/reviews/:businessId | Add review |
| DELETE | /api/reviews/:id | Delete review |
| POST | /api/reviews/:id/report | Report a review (logged-in user) |

### Promotion Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/promotions/business/:businessId | Active promotions of a business (public) |
| GET  | /api/promotions/mine | Owner's promotions |
| POST | /api/promotions | Add promotion (owner) |
| DELETE | /api/promotions/:id | Delete promotion |

### Admin Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/admin/stats | Dashboard stats |
| GET  | /api/admin/businesses | All businesses |
| GET  | /api/admin/businesses/pending | Pending businesses |
| POST | /api/admin/businesses/:id/approve | Approve business |
| POST | /api/admin/businesses/:id/reject | Reject business |
| POST | /api/admin/businesses/:id/suspend | Suspend business |
| GET  | /api/admin/users | All users |
| POST | /api/admin/users/:id/block | Block user |
| POST | /api/admin/users/:id/unblock | Unblock user |
| GET  | /api/admin/reports | All reports |
| POST | /api/admin/reports/:id/dismiss | Dismiss report |
| POST | /api/admin/reports/:id/resolve | Mark report as resolved (action taken) |
| GET  | /api/admin/logs | Admin activity log (latest 100 actions) |

Admin decisions always carry a written explanation: `approve` needs `{ note }`,
`reject` needs `{ reason }`, `suspend` needs `{ reason }`, and `dismiss` / `resolve`
need `{ response }` (at least 5 characters). Owners see the note/reason on their
dashboard; people who filed a report see the response under **My Reports**.

### Report Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | /api/reports/mine | Reports filed by the logged-in user, with the admin's decision |

---

## SAMPLE LOGIN CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@localbiz.pk | admin123 |
| Owner 1 | yasir@localbiz.pk | password |
| Owner 2 | bilal@localbiz.pk | password |
| Customer | ahmed@email.com | password |

---

## FRONTEND SETUP

```bash
cd frontend
npm install
npm run dev        # opens http://localhost:3000
```

Backend `.env` options worth knowing:
- `EMAIL_USER` / `EMAIL_PASS` — Gmail + App Password for real OTP / notification emails.
- `ALLOW_DEV_OTP` — if email is not configured, the OTP is shown on screen (demo fallback).
  Set `ALLOW_DEV_OTP=false` to switch that fallback off.

---

## FOLDER STRUCTURE

```
localbiz-backend/
├── server.js              Main server
├── .env                   Environment variables
├── package.json           Dependencies
├── config/
│   └── db.js              Database connection
├── controllers/
│   ├── authController.js
│   ├── businessController.js
│   ├── reviewController.js
│   └── adminController.js
├── routes/
│   ├── auth.js
│   ├── businesses.js
│   ├── reviews.js
│   └── admin.js
├── middleware/
│   └── auth.js            JWT verification
└── database/
    └── localbiz.sql       Database tables + sample data
```
