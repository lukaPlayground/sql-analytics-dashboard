# SQL Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portfolio dashboard that showcases 4 SQL techniques (GROUP BY, WINDOW FUNCTION, CTE, Subquery+JOIN) using Northwind MySQL data, with a Node.js/Express backend and Vanilla JS + Chart.js frontend.

**Architecture:** Left sidebar navigation on desktop (hamburger overlay on mobile) lets users switch between 4 SQL query tabs. Each tab shows a business question, why-this-technique explanation, SQL code block, Chart.js visualization, and a one-line insight. Backend exposes one Express route per query; frontend fetches on tab switch and renders.

**Tech Stack:** Node.js 18+, Express 4, mysql2, cors, dotenv · Vanilla JS, Chart.js 4 · Railway (MySQL 8.0) · Render (backend) · Vercel (frontend)

---

## File Map

```
sql-analytics-dashboard/
├── backend/
│   ├── package.json
│   ├── server.js              # Express entry: mounts routes, cors, error handler
│   ├── db.js                  # mysql2 createPool, exports pool.promise()
│   └── routes/
│       ├── salesTrend.js      # GET /api/sales-trend
│       ├── productRanking.js  # GET /api/product-ranking
│       ├── customerCte.js     # GET /api/customer-cte
│       └── subqueryJoin.js    # GET /api/subquery-join
├── frontend/
│   ├── index.html             # Shell: sidebar + content area markup
│   ├── style.css              # Layout, sidebar, code block, chart area styles
│   └── app.js                 # Tab state, fetch, Chart.js render, hamburger
├── README.md                  # LOCAL ONLY — gitignored, future additions notes
└── .gitignore
```

---

## Task 1: Repo & .gitignore Setup

**Files:**
- Create: `.gitignore`
- Create: `README.md` (local only)

- [ ] **Step 1: Connect local repo to GitHub remote**

```bash
cd /Volumes/Windows/ai-code/sql-analytics-dashboard
git remote add origin https://github.com/lukaPlayground/sql-analytics-dashboard.git
git branch -M main
```

- [ ] **Step 2: Create .gitignore**

Create `/Volumes/Windows/ai-code/sql-analytics-dashboard/.gitignore`:
```
node_modules/
.env
README.md
.DS_Store
```

- [ ] **Step 3: Create local README.md (gitignored)**

Create `/Volumes/Windows/ai-code/sql-analytics-dashboard/README.md`:
```markdown
# SQL Analytics Dashboard — Local Notes

## Future Query Additions
- HAVING + filtering: "customers with repeat purchases"
- Moving Average via ROWS BETWEEN: 3-month rolling revenue
- Self JOIN: same-category product comparison

## DB Setup
- Railway MySQL 8.0
- Northwind source: https://github.com/dalers/mywind
- Import: mysql -h HOST -u USER -p DBNAME < northwind.sql
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore docs/
git commit -m "chore: add .gitignore and initial project docs"
git push -u origin main
```

Expected: push succeeds, README.md is NOT pushed (gitignored).

---

## Task 2: Backend — package.json & db.js

**Files:**
- Create: `backend/package.json`
- Create: `backend/db.js`
- Create: `backend/.env` (gitignored, not committed)

- [ ] **Step 1: Initialize backend package**

```bash
cd /Volumes/Windows/ai-code/sql-analytics-dashboard/backend
npm init -y
npm install express mysql2 cors dotenv
```

- [ ] **Step 2: Create backend/.env**

```
DB_HOST=your-railway-host
DB_PORT=3306
DB_USER=your-user
DB_PASS=your-password
DB_NAME=northwind
PORT=3000
FRONTEND_ORIGIN=http://localhost:5500
```

(Replace with actual Railway credentials from Railway dashboard > Connect tab.)

- [ ] **Step 3: Create backend/db.js**

```js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
```

- [ ] **Step 4: Verify DB connection manually**

Create a temp file `backend/testdb.js`:
```js
const db = require('./db');
db.query('SELECT 1').then(() => {
  console.log('DB connected');
  process.exit(0);
}).catch(err => {
  console.error('DB error:', err.message);
  process.exit(1);
});
```

Run:
```bash
node backend/testdb.js
```
Expected output: `DB connected`

Delete `testdb.js` after confirming.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/db.js
git commit -m "feat: backend db connection pool"
git push
```

---

## Task 3: Backend — server.js

**Files:**
- Create: `backend/server.js`

- [ ] **Step 1: Create backend/server.js**

```js
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
```

- [ ] **Step 2: Verify server starts (routes don't exist yet — expect require errors)**

```bash
node backend/server.js
```
Expected: error about missing route files. That's fine — confirms server.js loads.

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "feat: express server entry point with cors and error handler"
git push
```

---

## Task 4: Route — salesTrend (GROUP BY)

**Files:**
- Create: `backend/routes/salesTrend.js`

- [ ] **Step 1: Create backend/routes/salesTrend.js**

```js
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
```

- [ ] **Step 2: Start server and test endpoint**

```bash
node backend/server.js &
curl http://localhost:3000/api/sales-trend
```
Expected: JSON with `data` array (rows with year/month/revenue) and `sql` string.

- [ ] **Step 3: Kill background server**

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/salesTrend.js
git commit -m "feat: sales-trend endpoint (GROUP BY + aggregation)"
git push
```

---

## Task 5: Route — productRanking (WINDOW FUNCTION)

**Files:**
- Create: `backend/routes/productRanking.js`

- [ ] **Step 1: Create backend/routes/productRanking.js**

```js
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
```

- [ ] **Step 2: Test endpoint**

```bash
node backend/server.js &
curl http://localhost:3000/api/product-ranking
```
Expected: JSON with `data` array (rows with product_name, total_quantity, ranking 1–10).

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/productRanking.js
git commit -m "feat: product-ranking endpoint (RANK() OVER window function)"
git push
```

---

## Task 6: Route — customerCte (CTE)

**Files:**
- Create: `backend/routes/customerCte.js`

- [ ] **Step 1: Create backend/routes/customerCte.js**

```js
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
```

- [ ] **Step 2: Test endpoint**

```bash
node backend/server.js &
curl http://localhost:3000/api/customer-cte
```
Expected: JSON with `data` (top 10 customers), `totalRevenue` (grand total), `sql`.

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/customerCte.js
git commit -m "feat: customer-cte endpoint (CTE multi-step aggregation)"
git push
```

---

## Task 7: Route — subqueryJoin (Subquery + JOIN)

**Files:**
- Create: `backend/routes/subqueryJoin.js`

- [ ] **Step 1: Create backend/routes/subqueryJoin.js**

```js
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
```

- [ ] **Step 2: Test endpoint**

```bash
node backend/server.js &
curl http://localhost:3000/api/subquery-join
```
Expected: JSON with `data` (countries with above-average order values, sorted by total_revenue DESC).

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/subqueryJoin.js
git commit -m "feat: subquery-join endpoint (subquery + JOIN + HAVING)"
git push
```

---

## Task 8: Frontend — index.html

**Files:**
- Create: `frontend/index.html`

- [ ] **Step 1: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SQL Analytics Dashboard</title>
  <link rel="stylesheet" href="style.css" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
</head>
<body>
  <button class="hamburger" id="hamburger" aria-label="Open menu">&#9776;</button>

  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">Dashboard</div>
    <ul class="nav-list">
      <li class="nav-item active" data-tab="sales-trend">GROUP BY</li>
      <li class="nav-item" data-tab="product-ranking">WINDOW</li>
      <li class="nav-item" data-tab="customer-cte">CTE</li>
      <li class="nav-item" data-tab="subquery-join">SUB+JOIN</li>
    </ul>
  </nav>

  <div class="overlay" id="overlay"></div>

  <main class="content" id="content">
    <div class="tab-pane" id="tab-panel">
      <p class="question" id="question"></p>
      <p class="why" id="why"></p>
      <pre class="sql-block"><code id="sql-code"></code></pre>
      <div class="chart-wrapper">
        <canvas id="chart"></canvas>
      </div>
      <p class="insight" id="insight"></p>
    </div>
    <div class="error-state hidden" id="error-state">
      Failed to load data. Please try again later.
    </div>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "feat: frontend HTML shell with sidebar and content area"
git push
```

---

## Task 9: Frontend — style.css

**Files:**
- Create: `frontend/style.css`

- [ ] **Step 1: Create frontend/style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  color: #111;
  background: #fff;
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 200px;
  min-height: 100vh;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 24px 20px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
}

.nav-list { list-style: none; }

.nav-item {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  border-left: 3px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.nav-item:hover { color: #111; }

.nav-item.active {
  color: #111;
  border-left-color: #111;
  font-weight: 500;
}

/* Content */
.content {
  flex: 1;
  padding: 40px 48px;
  max-width: 860px;
}

.question {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
}

.why {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 24px;
}

.sql-block {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 16px 20px;
  overflow-x: auto;
  margin-bottom: 32px;
}

.sql-block code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  color: #222;
}

.chart-wrapper {
  margin-bottom: 16px;
  max-width: 700px;
}

.insight {
  font-size: 13px;
  color: #555;
  font-style: italic;
}

.error-state {
  color: #c00;
  font-size: 14px;
  padding: 20px 0;
}

.hidden { display: none; }

/* Hamburger — hidden on desktop */
.hamburger {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  background: none;
  border: 1px solid #ddd;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
}

/* Overlay */
.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 99;
}

/* Mobile */
@media (max-width: 640px) {
  body { display: block; }

  .hamburger { display: block; }

  .sidebar {
    position: fixed;
    top: 0; left: 0;
    height: 100%;
    z-index: 100;
    background: #fff;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    min-height: unset;
  }

  .sidebar.open { transform: translateX(0); }

  .overlay.open { display: block; }

  .content {
    padding: 64px 20px 32px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/style.css
git commit -m "feat: frontend styles — minimal layout, sidebar, mobile hamburger"
git push
```

---

## Task 10: Frontend — app.js

**Files:**
- Create: `frontend/app.js`

- [ ] **Step 1: Create frontend/app.js**

```js
const BACKEND_URL = 'http://localhost:3000'; // Change to Render URL before deploying

const TABS = {
  'sales-trend': {
    question: 'How did Northwind\'s monthly revenue change over time?',
    why: 'Aggregating sales by time period is the most fundamental analytical pattern. GROUP BY with SUM lets us collapse thousands of order rows into a single revenue figure per month — no other technique is needed here.',
    chartType: 'line',
    buildChart: (data, ctx) => ({
      type: 'line',
      data: {
        labels: data.map(r => `${r.year}-${String(r.month).padStart(2,'0')}`),
        datasets: [{
          label: 'Monthly Revenue ($)',
          data: data.map(r => r.revenue),
          borderColor: '#111',
          backgroundColor: 'rgba(0,0,0,0.05)',
          tension: 0.3,
          pointRadius: 3,
        }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } },
    }),
    insight: (data) => {
      const peak = data.reduce((a, b) => a.revenue > b.revenue ? a : b);
      const low = data.reduce((a, b) => a.revenue < b.revenue ? a : b);
      return `Peak: ${peak.year}-${String(peak.month).padStart(2,'0')} ($${peak.revenue.toLocaleString()}) · Lowest: ${low.year}-${String(low.month).padStart(2,'0')} ($${low.revenue.toLocaleString()})`;
    },
  },
  'product-ranking': {
    question: 'Which products rank highest by total units sold?',
    why: 'RANK() OVER assigns row rankings in a single pass without needing a self-join or correlated subquery. The inner query aggregates by product; the outer query applies the window function — cleaner and more expressive than an equivalent GROUP BY workaround.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.product_name),
        datasets: [{
          label: 'Units Sold',
          data: data.map(r => r.total_quantity),
          backgroundColor: data.map((_, i) => i < 3 ? '#111' : '#ccc'),
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    }),
    insight: (data) => `#1: ${data[0].product_name} (${data[0].total_quantity} units)`,
  },
  'customer-cte': {
    question: 'Among customers who made at least one purchase, who is the most valuable?',
    why: 'A CTE (Common Table Expression) breaks the query into named steps: first compute total revenue per customer, then select the top results. This makes multi-step aggregation readable — the logic is linear, not nested.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.customer_name),
        datasets: [{
          label: 'Total Revenue ($)',
          data: data.map(r => r.total_revenue),
          backgroundColor: '#111',
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    }),
    insight: (data, meta) => {
      const top10Sum = data.reduce((sum, r) => sum + r.total_revenue, 0);
      const pct = meta.totalRevenue ? ((top10Sum / meta.totalRevenue) * 100).toFixed(1) : '?';
      return `Top 10 customers account for ${pct}% of total revenue`;
    },
  },
  'subquery-join': {
    question: 'Which countries generate above-average order values?',
    why: 'A subquery in the HAVING clause computes the global average order value once; the outer query groups by country and filters out any country whose average falls below that benchmark. This pattern — scalar subquery as a dynamic threshold — is a common real-world SQL technique.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.country),
        datasets: [{
          label: 'Total Revenue ($)',
          data: data.map(r => r.total_revenue),
          backgroundColor: data.map((_, i) => i === 0 ? '#111' : '#ccc'),
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    }),
    insight: (data) => `Top country: ${data[0].country} ($${Number(data[0].total_revenue).toLocaleString()})`,
  },
};

let chartInstance = null;

function showError(show) {
  document.getElementById('error-state').classList.toggle('hidden', !show);
  document.getElementById('tab-panel').classList.toggle('hidden', show);
}

async function loadTab(tabKey) {
  const config = TABS[tabKey];
  showError(false);

  document.getElementById('question').textContent = config.question;
  document.getElementById('why').textContent = config.why;
  document.getElementById('sql-code').textContent = '';
  document.getElementById('insight').textContent = '';

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  try {
    const res = await fetch(`${BACKEND_URL}/api/${tabKey}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    document.getElementById('sql-code').textContent = json.sql;

    const ctx = document.getElementById('chart').getContext('2d');
    chartInstance = new Chart(ctx, config.buildChart(json.data, json));

    const insightText = config.insight(json.data, json);
    document.getElementById('insight').textContent = insightText;
  } catch (err) {
    console.error(err);
    showError(true);
  }
}

function setActiveTab(tabKey) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabKey);
  });
}

// Tab navigation
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    const key = el.dataset.tab;
    setActiveTab(key);
    loadTab(key);
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  });
});

// Hamburger
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

hamburger.addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('open');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
});

// Load first tab on start
loadTab('sales-trend');
```

- [ ] **Step 2: Smoke-test locally**

Start the backend:
```bash
node backend/server.js
```

Open `frontend/index.html` in a browser (use VS Code Live Server or `npx serve frontend`).

Check:
- [ ] Sidebar shows 4 items, GROUP BY active by default
- [ ] Line chart renders for sales-trend
- [ ] SQL code block shows the query
- [ ] Clicking WINDOW tab loads product-ranking bar chart
- [ ] Clicking CTE tab loads customer-cte bar chart with % insight
- [ ] Clicking SUB+JOIN tab loads subquery-join bar chart
- [ ] Resize to mobile: hamburger appears, sidebar hides, tap hamburger → sidebar opens, tap item → closes

- [ ] **Step 3: Commit**

```bash
git add frontend/app.js
git commit -m "feat: frontend tab navigation, fetch, Chart.js rendering, mobile hamburger"
git push
```

---

## Task 11: Deploy — Railway DB Setup

- [ ] **Step 1: Set up Railway MySQL database**

1. Go to [railway.app](https://railway.app) → New Project → Database → MySQL
2. Wait for provisioning
3. Click the MySQL service → Connect tab → copy connection variables:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

- [ ] **Step 2: Import Northwind data**

```bash
# Download Northwind SQL
curl -L https://raw.githubusercontent.com/dalers/mywind/master/northwind.sql -o northwind.sql

# Import into Railway DB
mysql -h MYSQL_HOST -P MYSQL_PORT -u MYSQL_USER -p MYSQL_DATABASE < northwind.sql
```

Replace placeholders with actual Railway values. Enter password when prompted.

- [ ] **Step 3: Verify data**

```bash
mysql -h MYSQL_HOST -P MYSQL_PORT -u MYSQL_USER -p MYSQL_DATABASE -e "SELECT COUNT(*) FROM orders;"
```
Expected: a non-zero count (Northwind has 830 orders).

---

## Task 12: Deploy — Render Backend

**Files:**
- Create: `backend/render.yaml` (optional — can configure via Render UI)

- [ ] **Step 1: Push latest code to GitHub**

```bash
git push
```

- [ ] **Step 2: Create Render Web Service**

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo `lukaPlayground/sql-analytics-dashboard`
3. Settings:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Environment: Node

- [ ] **Step 3: Add environment variables in Render dashboard**

```
DB_HOST=<Railway MYSQL_HOST>
DB_PORT=<Railway MYSQL_PORT>
DB_USER=<Railway MYSQL_USER>
DB_PASS=<Railway MYSQL_PASSWORD>
DB_NAME=northwind
FRONTEND_ORIGIN=https://<your-vercel-url>  (add after Vercel deploy)
```

- [ ] **Step 4: Test Render URL**

```bash
curl https://<your-render-url>/api/sales-trend
```
Expected: JSON response with data and sql.

---

## Task 13: Deploy — Vercel Frontend

- [ ] **Step 1: Update BACKEND_URL in app.js**

In `frontend/app.js`, change line 1:
```js
const BACKEND_URL = 'https://<your-render-url>';
```

- [ ] **Step 2: Update FRONTEND_ORIGIN in Render**

In the Render dashboard env vars, set:
```
FRONTEND_ORIGIN=https://<your-vercel-url>
```

- [ ] **Step 3: Deploy to Vercel**

```bash
cd frontend
npx vercel --prod
```

Or via Vercel dashboard: New Project → import GitHub repo → set root directory to `frontend`.

- [ ] **Step 4: Smoke-test production**

Open the Vercel URL in a browser. Verify all 4 tabs load, charts render, SQL code shows, mobile hamburger works.

- [ ] **Step 5: Commit final BACKEND_URL**

```bash
git add frontend/app.js
git commit -m "chore: set production BACKEND_URL for Vercel deploy"
git push
```

---

## Task 14: Portfolio Integration

- [ ] **Step 1: Note the live URLs**

```
Frontend: https://<vercel-url>
Backend:  https://<render-url>
Repo:     https://github.com/lukaPlayground/sql-analytics-dashboard
```

- [ ] **Step 2: Add to lukaPlayground.github.io works section**

In the portfolio site repo, add a works entry with:
- Title: SQL Analytics Dashboard
- Description: Interactive dashboard showcasing 4 SQL techniques (GROUP BY, Window Functions, CTE, Subquery+JOIN) on the Northwind database
- Tags: SQL, Node.js, Chart.js, MySQL
- Link: Vercel URL
- Repo: GitHub URL
