// Change this if your backend runs on a different host/port in production.
const API_BASE = '/api';

let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let viewDate = new Date(); // month currently shown on the dashboard
let selectedType = 'expense';

// ---------- Element refs ----------
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');

const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');

const currentMonthLabel = document.getElementById('currentMonthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const totalBalanceEl = document.getElementById('totalBalance');

const transactionForm = document.getElementById('transactionForm');
const txAmount = document.getElementById('txAmount');
const txDate = document.getElementById('txDate');
const txDescription = document.getElementById('txDescription');
const txCategory = document.getElementById('txCategory');
const txError = document.getElementById('txError');
const typeButtons = document.querySelectorAll('.type-btn');

const txListEl = document.getElementById('txList');
const noTxEl = document.getElementById('noTx');

// ---------- Helpers ----------
function formatMoney(amount) {
  return '₹' + Number(amount).toFixed(2);
}

function monthLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  welcomeUser.textContent = `Hi, ${currentUser.name}`;
  txDate.valueAsDate = new Date();
  loadDashboard();
}

function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

// ---------- Auth tab switching ----------
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
});

tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

// ---------- Login ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// ---------- Signup ----------
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupError.textContent = '';

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    signupError.textContent = err.message;
  }
});

// ---------- Logout ----------
logoutBtn.addEventListener('click', () => {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showAuth();
});

// ---------- Month navigation ----------
prevMonthBtn.addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  loadDashboard();
});

nextMonthBtn.addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  loadDashboard();
});

// ---------- Transaction type toggle ----------
typeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    typeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
  });
});

// ---------- Add transaction ----------
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  txError.textContent = '';

  try {
    await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: selectedType,
        amount: txAmount.value,
        description: txDescription.value.trim(),
        category: txCategory.value.trim(),
        date: txDate.value,
      }),
    });
    txAmount.value = '';
    txDescription.value = '';
    txCategory.value = '';
    loadDashboard();
  } catch (err) {
    txError.textContent = err.message;
  }
});

// ---------- Delete transaction ----------
async function deleteTransaction(id) {
  try {
    await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Load dashboard (summary + list) for the current viewDate month ----------
async function loadDashboard() {
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();
  currentMonthLabel.textContent = monthLabel(viewDate);

  try {
    const [summary, txData] = await Promise.all([
      apiRequest(`/transactions/summary?month=${month}&year=${year}`),
      apiRequest(`/transactions?month=${month}&year=${year}`),
    ]);

    totalIncomeEl.textContent = formatMoney(summary.income);
    totalExpenseEl.textContent = formatMoney(summary.expense);
    totalBalanceEl.textContent = formatMoney(summary.balance);

    renderTransactions(txData.transactions);
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('log in')) {
      showAuth();
    }
  }
}

function renderTransactions(transactions) {
  txListEl.innerHTML = '';

  if (transactions.length === 0) {
    noTxEl.classList.remove('hidden');
    return;
  }
  noTxEl.classList.add('hidden');

  for (const tx of transactions) {
    const row = document.createElement('div');
    row.className = 'tx-row';

    const info = document.createElement('div');
    info.className = 'tx-info';
    const desc = document.createElement('div');
    desc.className = 'tx-desc';
    desc.textContent = tx.description || '(no description)';
    const meta = document.createElement('div');
    meta.className = 'tx-meta';
    meta.textContent = `${tx.date}${tx.category ? ' · ' + tx.category : ''}`;
    info.appendChild(desc);
    info.appendChild(meta);

    const amount = document.createElement('span');
    amount.className = `tx-amount ${tx.type}`;
    amount.textContent = (tx.type === 'income' ? '+' : '−') + formatMoney(tx.amount).replace('₹', '₹');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tx-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteTransaction(tx.id));

    row.appendChild(info);
    row.appendChild(amount);
    row.appendChild(deleteBtn);
    txListEl.appendChild(row);
  }
}

// ---------- Init ----------
if (token && currentUser) {
  showApp();
} else {
  showAuth();
}