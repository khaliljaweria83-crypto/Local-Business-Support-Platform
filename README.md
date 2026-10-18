# LocalBiz — Local Business Support Platform

A web-based local business directory where business owners list their businesses, an admin verifies them, and customers search, call, review and report businesses.

**Final Year Project — BSIT22-G3**
**Team:** Yasir Mehmood (076984) & Hafiz Bilal Khalil (077018)
**Advisor:** Prof. Imran Shafique
**College:** Govt. Graduate Islamia College (GIOC), Gujranwala — Session 2022–2026

> **Final Year Documentation (PDF):** [`docs/Final_Year_Documentation_Bilal_and_Yasir.pdf`](docs/Final_Year_Documentation_Bilal_and_Yasir.pdf)
> **Technical documentation:** [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md)

---

## Features

- **Customers:** search businesses by name, category and city, view details and map location, one-click call, write reviews, report businesses/reviews, track report decisions.
- **Business owners:** register and manage businesses, upload photos, add promotions, see the admin's approval/rejection note.
- **Admin:** approve / reject / suspend businesses, block / unblock users, handle reports, dashboard statistics and a full activity log. Every decision needs a written reason.
- **Security:** JWT authentication, bcrypt password hashing, email OTP verification, strong-password rule, rate limiting, parameterized SQL queries.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Leaflet maps, lucide-react |
| Backend | Node.js, Express |
| Database | MySQL / MariaDB (XAMPP) |
| Auth & Mail | JWT, bcryptjs, Nodemailer (Gmail SMTP) |
| Uploads | Multer |

## Project Structure

```
FYP/
├── backend/        Express API (routes -> controllers -> MySQL)
│   ├── config/  controllers/  routes/  middleware/  services/
│   ├── database/   localbiz.sql (schema + sample data) + seed files
│   ├── uploads/    sample business photos
│   └── .env.example
├── frontend/       React app (Vite)
│   └── src/ pages/ components/ context/
├── docs/           Final year documentation (PDF) + technical documentation
└── README.md
```

## How to Run Locally

**Requirements:** Node.js 18+, XAMPP (MySQL), Git.

1. **Clone**
   ```bash
   git clone https://github.com/<username>/<repo-name>.git
   cd <repo-name>
   ```
2. **Database** — start MySQL in XAMPP, open `http://localhost/phpmyadmin`, create database `localbiz`, then *Import* `backend/database/localbiz.sql`.
3. **Backend**
   ```bash
   cd backend
   copy .env.example .env      # (Linux/Mac: cp .env.example .env)
   npm install
   npm run dev                 # http://localhost:5000
   ```
4. **Frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev                 # http://localhost:3000
   ```

## Demo Logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@localbiz.pk | admin123 |
| Owner | yasir@localbiz.pk | password |
| Customer | ahmed@email.com | password |

## Email / OTP

Set `EMAIL_USER` and `EMAIL_PASS` (Gmail App Password) in `backend/.env` for real emails. If left blank, the app still works and shows the OTP on screen (demo mode, controlled by `ALLOW_DEV_OTP`).

## License

Academic project — for educational purposes.
