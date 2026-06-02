const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
SELECT
  c.company AS customer_name,
  COUNT(DISTINCT o.id) AS order_count,
  ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount)), 2) AS total_spent
FROM orders o
JOIN order_details od ON o.id = od.order_id
JOIN customers c ON o.customer_id = c.id
WHERE c.id IN (
  SELECT DISTINCT o2.customer_id
  FROM orders o2
  JOIN order_details od2 ON o2.id = od2.order_id
  GROUP BY o2.id
  HAVING SUM(od2.unit_price * od2.quantity * (1 - od2.discount)) > (
    SELECT AVG(order_total)
    FROM (
      SELECT SUM(od3.unit_price * od3.quantity * (1 - od3.discount)) AS order_total
      FROM orders o3
      JOIN order_details od3 ON o3.id = od3.order_id
      GROUP BY o3.id
    ) AS totals
  )
)
GROUP BY c.id, c.company
ORDER BY total_spent DESC
LIMIT 10
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
