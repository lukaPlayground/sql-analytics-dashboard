const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
SELECT
  YEAR(o.order_date)  AS year,
  MONTH(o.order_date) AS month,
  ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount)), 2) AS revenue
FROM orders o
JOIN order_details od ON o.id = od.order_id
WHERE o.order_date IS NOT NULL
GROUP BY YEAR(o.order_date), MONTH(o.order_date)
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
