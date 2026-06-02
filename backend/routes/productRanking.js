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
    p.ProductName AS product_name,
    SUM(od.Quantity) AS total_quantity
  FROM \`order details\` od
  JOIN products p ON od.ProductID = p.ProductID
  GROUP BY p.ProductID, p.ProductName
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
