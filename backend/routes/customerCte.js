const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
WITH customer_totals AS (
  SELECT
    c.CustomerID,
    c.CompanyName AS customer_name,
    ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 2) AS total_revenue
  FROM customers c
  JOIN orders o ON c.CustomerID = o.CustomerID
  JOIN \`order details\` od ON o.OrderID = od.OrderID
  GROUP BY c.CustomerID, c.CompanyName
)
SELECT
  customer_name,
  total_revenue
FROM customer_totals
ORDER BY total_revenue DESC
LIMIT 10
`;

const TOTAL_SQL = `
SELECT ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 2) AS grand_total
FROM \`order details\` od
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
