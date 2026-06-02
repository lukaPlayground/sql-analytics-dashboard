const BACKEND_URL = 'http://localhost:3000';

const TABS = {
  'sales-trend': {
    question: '월별 매출 집계',
    why: 'GROUP BY로 수천 건의 주문 행을 월별로 집계합니다. SUM과 결합하면 각 월의 총 매출을 한 줄로 요약할 수 있어 시계열 분석의 가장 기본적인 패턴입니다.',
    buildChart: (data) => ({
      type: 'line',
      data: {
        labels: data.map(r => `${r.year}-${String(r.month).padStart(2,'0')}`),
        datasets: [{
          label: '월 매출 ($)',
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
      return `최고: ${peak.year}-${String(peak.month).padStart(2,'0')} ($${Number(peak.revenue).toLocaleString()}) · 최저: ${low.year}-${String(low.month).padStart(2,'0')} ($${Number(low.revenue).toLocaleString()})`;
    },
  },
  'product-ranking': {
    question: '상품별 판매량 순위',
    why: 'RANK() OVER는 서브쿼리나 셀프 조인 없이 단일 패스로 순위를 부여합니다. 내부 쿼리에서 상품별로 집계하고, 외부 쿼리에서 윈도우 함수를 적용해 순위를 매기는 방식입니다.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.product_name),
        datasets: [{
          label: '판매량',
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
    insight: (data) => data.length ? `1위: ${data[0].product_name} (${Number(data[0].total_quantity).toLocaleString()} 개)` : '',
  },
  'customer-cte': {
    question: '고객별 총 구매액 분석',
    why: 'CTE(공통 테이블 표현식)는 복잡한 집계를 단계별로 분리합니다. 먼저 고객별 총 매출을 계산하고, 메인 쿼리에서 상위 결과를 선택하는 방식으로 로직을 선형적으로 읽을 수 있게 합니다.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.customer_name),
        datasets: [{
          label: '총 구매액 ($)',
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
      return `상위 10개 고객이 전체 매출의 ${pct}%를 차지합니다`;
    },
  },
  'subquery-join': {
    question: '평균 이상 주문 고객 필터링',
    why: '서브쿼리로 전체 평균 주문 금액을 계산하고, IN + JOIN으로 해당 기준을 초과한 고객만 필터링합니다. 스칼라 서브쿼리를 동적 임계값으로 사용하는 패턴은 실무에서 자주 쓰이는 기법입니다.',
    buildChart: (data) => ({
      type: 'bar',
      data: {
        labels: data.map(r => r.customer_name),
        datasets: [{
          label: '총 구매액 ($)',
          data: data.map(r => r.total_spent),
          backgroundColor: data.map((_, i) => i === 0 ? '#111' : '#ccc'),
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    }),
    insight: (data) => data.length ? `1위: ${data[0].customer_name} — $${Number(data[0].total_spent).toLocaleString()} (${data[0].order_count}건)` : '',
  },
};

let chartInstance = null;

function showPanel(panel) {
  document.getElementById('home-panel').classList.toggle('hidden', panel !== 'home');
  document.getElementById('tab-panel').classList.toggle('hidden', panel !== 'chart');
  document.getElementById('db-panel').classList.toggle('hidden', panel !== 'db');
}

function setActiveNav(tabKey) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tabKey)
  );
}

function setLoading(isLoading) {
  const loading = document.getElementById('loading');
  if (isLoading) {
    loading.classList.remove('hidden');
    document.getElementById('sql-code').textContent = '';
    document.getElementById('insight').textContent = '';
    document.getElementById('error-state').classList.add('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

async function loadTab(tabKey) {
  showPanel('chart');
  setActiveNav(tabKey);
  setLoading(true);

  const config = TABS[tabKey];
  document.getElementById('question').textContent = config.question;
  document.getElementById('why').textContent = config.why;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  try {
    const res = await fetch(`${BACKEND_URL}/api/${tabKey}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    setLoading(false);
    document.getElementById('sql-code').textContent = json.sql;
    const ctx = document.getElementById('chart').getContext('2d');
    chartInstance = new Chart(ctx, config.buildChart(json.data, json));
    document.getElementById('insight').textContent = config.insight(json.data, json);
  } catch (err) {
    console.error(err);
    setLoading(false);
    document.getElementById('error-state').classList.remove('hidden');
  }
}

// DATABASE 탭
let currentTable = 'orders';

async function loadTable(tableName) {
  currentTable = tableName;
  document.querySelectorAll('.table-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.table === tableName)
  );
  document.getElementById('table-insight').textContent = '불러오는 중...';
  document.getElementById('db-error-state').classList.add('hidden');
  document.getElementById('table-head').innerHTML = '';
  document.getElementById('table-body').innerHTML = '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/tables/${tableName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (!json.data.length) {
      document.getElementById('table-insight').textContent = '데이터 없음';
      return;
    }

    const cols = Object.keys(json.data[0]);
    document.getElementById('table-head').innerHTML =
      '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
    document.getElementById('table-body').innerHTML =
      json.data.map(row =>
        '<tr>' + cols.map(c => `<td>${row[c] ?? ''}</td>`).join('') + '</tr>'
      ).join('');
    document.getElementById('table-insight').textContent = `${json.data.length}행 표시 중`;
  } catch (err) {
    document.getElementById('table-insight').textContent = '';
    document.getElementById('db-error-state').classList.remove('hidden');
  }
}

function loadDbPanel() {
  showPanel('db');
  setActiveNav('database');
  loadTable(currentTable);
}

// 탭 네비게이션
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
    if (el.dataset.tab === 'home') {
      showPanel('home');
      setActiveNav('home');
    } else if (el.dataset.tab === 'database') {
      loadDbPanel();
    } else {
      loadTab(el.dataset.tab);
    }
  });
});

// 랜딩 카드 클릭
document.querySelectorAll('.query-card').forEach(card => {
  card.addEventListener('click', () => loadTab(card.dataset.tab));
});

// DATABASE 링크
document.getElementById('db-link').addEventListener('click', (e) => {
  e.preventDefault();
  loadDbPanel();
});

// 테이블 버튼
document.querySelectorAll('.table-btn').forEach(btn => {
  btn.addEventListener('click', () => loadTable(btn.dataset.table));
});

// 햄버거
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
});
document.getElementById('overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
});

// 초기: 홈 화면
showPanel('home');
