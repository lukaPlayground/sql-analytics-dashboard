const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
SELECT
  YEAR(o.OrderDate)  AS year,
  MONTH(o.OrderDate) AS month,
  ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 2) AS revenue
FROM orders o
JOIN \`order details\` od ON o.OrderID = od.OrderID
WHERE o.OrderDate IS NOT NULL
GROUP BY YEAR(o.OrderDate), MONTH(o.OrderDate)
ORDER BY year, month
`;

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(SQL);
    res.json({ data: rows, sql: SQL.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
