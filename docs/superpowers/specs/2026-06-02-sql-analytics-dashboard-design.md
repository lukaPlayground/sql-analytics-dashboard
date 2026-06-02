# SQL Analytics Dashboard — Design Spec
**Date:** 2026-06-02

## Overview

A portfolio project showcasing SQL query skills using the Northwind MySQL database. The dashboard presents 4 SQL techniques as interactive, narrative-driven visualizations — each pairing a business question, the SQL code used to answer it, a chart, and a one-line insight.

**Stack:** Node.js + Express + mysql2 (backend) · Vanilla JS + Chart.js (frontend)  
**Deploy:** Render (backend) · Vercel (frontend) · Railway (MySQL DB)  
**MySQL version required:** 8.0+ (WINDOW FUNCTION support)  
**Northwind source:** [northwind-MySQL](https://github.com/dalers/mywind) community port  
**Repo:** https://github.com/lukaPlayground/sql-analytics-dashboard

---

## Architecture

```
sql-analytics-dashboard/
├── backend/
│   ├── server.js              # Express app entry point + CORS
│   ├── db.js                  # mysql2 connection pool
│   ├── routes/
│   │   ├── salesTrend.js      # GROUP BY + aggregation
│   │   ├── productRanking.js  # RANK() OVER (WINDOW FUNCTION)
│   │   ├── customerCte.js     # CTE
│   │   └── subqueryJoin.js    # Subquery + JOIN
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── .gitignore
```

**Data flow:**
```
Sidebar tab click
  → fetch /api/<endpoint>
    → Express route
      → mysql2 executes query against Northwind DB
        → JSON response
          → Chart.js renders chart + SQL code + description displayed
```

---

## Backend

### API Endpoints

Each SQL technique maps 1:1 to a route file and endpoint. Adding a new query = new route file + new endpoint.

| Endpoint | Route File | SQL Technique |
|---|---|---|
| `GET /api/sales-trend` | `salesTrend.js` | GROUP BY + aggregation |
| `GET /api/product-ranking` | `productRanking.js` | RANK() OVER |
| `GET /api/customer-cte` | `customerCte.js` | CTE |
| `GET /api/subquery-join` | `subqueryJoin.js` | Subquery + JOIN |

All endpoints return JSON: `{ data: [...], sql: "..." }`

### Environment Variables (Render)
```
DB_HOST, DB_USER, DB_PASS, DB_NAME, PORT, FRONTEND_ORIGIN
```

### CORS
`cors` middleware configured to allow `FRONTEND_ORIGIN` env var (set to the Vercel deployment URL).

### Error Handling
All route handlers return `{ error: "message" }` with appropriate HTTP status on DB failure. Frontend shows a static error message in the chart area when a fetch fails.

---

## Queries & Business Stories

### Tab 1 — GROUP BY + Aggregation
**Question:** "How did Northwind's monthly revenue change over time?"  
**Why this technique:** Aggregating sales by time period requires GROUP BY with SUM — the most fundamental analytical pattern.  
**Chart:** Line chart (x = month, y = revenue)  
**Insight:** Highlight peak and lowest revenue months.

Tables: `Orders` JOIN `Order Details`  
Key SQL: `GROUP BY YEAR(OrderDate), MONTH(OrderDate)` + `SUM(UnitPrice * Quantity * (1 - Discount))`

---

### Tab 2 — Window Function (RANK)
**Question:** "Which products rank highest by total units sold?"  
**Why this technique:** RANK() OVER assigns row rankings without a self-join or subquery — cleaner and more expressive than GROUP BY alone.  
**Chart:** Horizontal bar chart (TOP 10 products)  
**Insight:** Highlight rank 1–3.

Tables: `Order Details` JOIN `Products`  
Key SQL: Pre-aggregate with `GROUP BY ProductID`, then wrap in subquery/CTE and apply `RANK() OVER (ORDER BY total_quantity DESC)`. MySQL 8+ supports window functions alongside GROUP BY aggregates.

---

### Tab 3 — CTE
**Question:** "Among all customers who made at least one purchase, who is the most valuable?"  
**Why this technique:** CTE makes multi-step aggregation readable — first aggregate per customer, then filter/rank in the main query.  
**Chart:** Horizontal bar chart (TOP 10 customers by total order value)  
**Insight:** Top 10 customers' share of total revenue — computed on the frontend by summing the returned top-10 values against a separately fetched total (or included in the API response as `{ topCustomers: [...], totalRevenue: N }`).

Tables: `Customers` JOIN `Orders` JOIN `Order Details`  
Key SQL: `WITH customer_totals AS (SELECT ... SUM(...)) SELECT ...`

---

### Tab 4 — Subquery + JOIN
**Question:** "Which countries generate above-average order values?"  
**Why this technique:** A subquery computes the global average, then a JOIN filters and groups by country — demonstrating subquery composition with aggregation.  
**Chart:** Horizontal bar chart — total revenue per country, filtered to only countries whose average order value exceeds the global average. Each bar = total revenue from that country's qualifying orders.  
**Insight:** Highlight top revenue country.

Tables: `Orders` JOIN `Order Details` JOIN `Customers`  
Key SQL: Subquery computes global average order value; outer query groups by `Country`, filters with `HAVING AVG(order_total) > (subquery)`, orders by total revenue DESC.

---

## Frontend

### Layout

**Desktop:** Left sidebar (fixed width ~200px) + right content area (flex-grow).  
**Mobile:** Hamburger button opens sidebar as overlay, closes on tab selection.

```
┌──────────┬──────────────────────────────────┐
│ Dashboard│  Business question (1 line)       │
│──────────│  Why this technique (2-3 lines)   │
│ GROUP BY │                                   │
│ WINDOW   │  ┌─ SQL ──────────────────────┐   │
│ CTE      │  │  SELECT ...               │   │
│ SUB+JOIN │  └────────────────────────────┘   │
│          │                                   │
│          │  ┌─ Chart ─────────────────────┐  │
│          │  │                             │  │
│          │  └─────────────────────────────┘  │
│          │  Insight (1 line)                 │
└──────────┴──────────────────────────────────┘
```

### Style
- Background: `#ffffff`, Text: `#111111`
- Active sidebar tab: left border highlight only (no fill)
- SQL code block: `#f5f5f5` background, monospace font
- Body font: system sans-serif
- No external CSS framework

### app.js responsibilities
- Tab navigation state management
- `fetch` calls to backend on tab switch (using hardcoded `BACKEND_URL` constant at top of file, pointing to Render service URL)
- Chart.js instance creation/destruction per tab
- SQL code block and description rendering
- Hamburger menu toggle for mobile
- Error state rendering when fetch fails

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Backend | Render | Node.js service, env vars for DB |
| Frontend | Vercel | Static files, `BACKEND_URL` constant |

Frontend `BACKEND_URL` points to the Render service URL.

---

## Future Additions (local reference only)

Tracked in local `README.md` (gitignored):
- HAVING + filtering — "customers with repeat purchases"
- Moving Average via `ROWS BETWEEN` — 3-month rolling revenue
- Self JOIN — same-category product comparison
