const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
SELECT
  c.Country AS country,
  ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 2) AS total_revenue,
  COUNT(DISTINCT o.OrderID) AS order_count
FROM orders o
JOIN \`order details\` od ON o.OrderID = od.OrderID
JOIN customers c ON o.CustomerID = c.CustomerID
GROUP BY c.Country
HAVING AVG(od.UnitPrice * od.Quantity * (1 - od.Discount)) > (
  SELECT AVG(od2.UnitPrice * od2.Quantity * (1 - od2.Discount))
  FROM \`order details\` od2
)
ORDER BY total_revenue DESC
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
