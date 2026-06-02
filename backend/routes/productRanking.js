const express = require('express');
const db = require('../db');
const router = express.Router();

const SQL = `
SELECT
  product_name,
  total_quantity,
  RANK() OVER (ORDER BY total_quantity DESC) AS ranking
FROM (
  SELECT
    p.product_name,
    SUM(od.quantity) AS total_quantity
  FROM order_details od
  JOIN products p ON od.product_id = p.id
  GROUP BY p.id, p.product_name
) AS aggregated
ORDER BY ranking
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
