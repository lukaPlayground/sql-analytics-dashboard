const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
WITH customer_totals AS (
  SELECT
    c.id,
    c.company AS customer_name,
    ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount)), 2) AS total_revenue
  FROM customers c
  JOIN orders o ON c.id = o.customer_id
  JOIN order_details od ON o.id = od.order_id
  GROUP BY c.id, c.company
)
SELECT
  customer_name,
  total_revenue
FROM customer_totals
ORDER BY total_revenue DESC
LIMIT 10
`;

const TOTAL_SQL = `
SELECT ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount)), 2) AS grand_total
FROM order_details od
`;

router.get('/', async (req, res) => {
  try {
    const [[rows], [[{ grand_total }]]] = await Promise.all([
      db.query(SQL),
      db.query(TOTAL_SQL),
    ]);
    res.json({ data: rows, totalRevenue: grand_total, sql: SQL.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
