# Trackly

A personal income/expense tracker with real accounts. Sign up, log in,
add income and expense transactions with descriptions, and see monthly
totals for income, expenses, and balance.

## Stack
- Backend: Node.js + Express + SQLite (better-sqlite3) + JWT auth + bcrypt
- Frontend: Plain HTML/CSS/JS (no framework, no build step)

## Running locally

```bash
cd backend
npm install
cp .env.example .env   # then set a real JWT_SECRET
npm start
```

Then open http://localhost:5000