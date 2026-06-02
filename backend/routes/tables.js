const express = require('express');
const db = require('../db');
const router = express.Router();

const ALLOWED = {
  orders: `SELECT id, customer_id, order_date, shipped_date, ship_name, ship_city, ship_country_region AS country, status_id FROM orders ORDER BY id LIMIT 50`,
  order_details: `SELECT id, order_id, product_id, quantity, unit_price, discount FROM order_details ORDER BY id LIMIT 50`,
  customers: `SELECT id, company, city, country_region AS country, business_phone FROM customers ORDER BY id LIMIT 50`,
  products: `SELECT id, product_name, list_price, standard_cost, category FROM products ORDER BY id LIMIT 50`,
};

router.get('/:table', async (req, res) => {
  const sql = ALLOWED[req.params.table];
  if (!sql) return res.status(404).json({ error: 'Table not found' });
  try {
    const [rows] = await db.query(sql);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
