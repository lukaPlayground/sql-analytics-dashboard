const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());

app.use('/api/sales-trend', require('./routes/salesTrend'));
app.use('/api/product-ranking', require('./routes/productRanking'));
app.use('/api/customer-cte', require('./routes/customerCte'));
app.use('/api/subquery-join', require('./routes/subqueryJoin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
