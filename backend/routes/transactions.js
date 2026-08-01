const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// All routes below require a valid logged-in user.
router.use(requireAuth);

// GET /api/transactions?month=7&year=2026
// Returns the logged-in user's transactions, optionally filtered to one month.
router.get('/', (req, res) => {
  const { month, year } = req.query;
  let rows;

  if (month && year) {
    const mm = String(month).padStart(2, '0');
    const prefix = `${year}-${mm}`;
    rows = db
      .prepare(
        `SELECT * FROM transactions
         WHERE user_id = ? AND date LIKE ?
         ORDER BY date DESC, id DESC`
      )
      .all(req.userId, `${prefix}%`);
  } else {
    rows = db
      .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC')
      .all(req.userId);
  }

  res.json({ transactions: rows });
});

// GET /api/transactions/summary?month=7&year=2026
// Returns total income, total expenses, and balance for that month.
router.get('/summary', (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'month and year query parameters are required.' });
  }

  const mm = String(month).padStart(2, '0');
  const prefix = `${year}-${mm}`;

  const totals = db
    .prepare(
      `SELECT type, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = ? AND date LIKE ?
       GROUP BY type`
    )
    .all(req.userId, `${prefix}%`);

  let income = 0;
  let expense = 0;
  for (const row of totals) {
    if (row.type === 'income') income = row.total;
    if (row.type === 'expense') expense = row.total;
  }

  res.json({
    month: Number(month),
    year: Number(year),
    income,
    expense,
    balance: income - expense,
  });
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { type, amount, description, category, date } = req.body;

  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: "type must be 'income' or 'expense'." });
  }
  const parsedAmount = Number(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number.' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format.' });
  }

  const result = db
    .prepare(
      `INSERT INTO transactions (user_id, type, amount, description, category, date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.userId, type, parsedAmount, description || '', category || '', date);

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ transaction: created });
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, req.userId);

  if (!existing) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const { type, amount, description, category, date } = req.body;

  const updated = {
    type: type && ['income', 'expense'].includes(type) ? type : existing.type,
    amount: amount ? Number(amount) : existing.amount,
    description: description !== undefined ? description : existing.description,
    category: category !== undefined ? category : existing.category,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : existing.date,
  };

  db.prepare(
    `UPDATE transactions SET type = ?, amount = ?, description = ?, category = ?, date = ?
     WHERE id = ? AND user_id = ?`
  ).run(updated.type, updated.amount, updated.description, updated.category, updated.date, id, req.userId);

  const result = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  res.json({ transaction: result });
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db
    .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .run(id, req.userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  res.json({ success: true });
});

module.exports = router;