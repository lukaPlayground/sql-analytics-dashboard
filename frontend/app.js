const BACKEND_URL = 'http://localhost:3000';

const TABS = {
  'sales-trend': {
    question: 'How did Northwind\'s monthly revenue change over time?',
    why: 'Aggregating sales by time period is the most fundamental analytical pattern. GROUP BY with SUM lets us collapse thousands of order rows into a single revenue figure per month — no other technique is needed here.',
    buildChart: (data) => ({
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
      if (!data.length) return '';
      const peak = data.reduce((a, b) => a.revenue > b.revenue ? a : b);
      const low = data.reduce((a, b) => a.revenue < b.revenue ? a : b);
      return `Peak: ${peak.year}-${String(peak.month).padStart(2,'0')} ($${Number(peak.revenue).toLocaleString()}) · Lowest: ${low.year}-${String(low.month).padStart(2,'0')} ($${Number(low.revenue).toLocaleString()})`;
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
    insight: (data) => data.length ? `#1: ${data[0].product_name} (${data[0].total_quantity} units)` : '',
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
      if (!data.length) return '';
      const top10Sum = data.reduce((sum, r) => sum + Number(r.total_revenue), 0);
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
    insight: (data) => data.length ? `Top country: ${data[0].country} ($${Number(data[0].total_revenue).toLocaleString()})` : '',
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

    document.getElementById('insight').textContent = config.insight(json.data, json);
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

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    const key = el.dataset.tab;
    setActiveTab(key);
    loadTab(key);
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  });
});

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

loadTab('sales-trend');
