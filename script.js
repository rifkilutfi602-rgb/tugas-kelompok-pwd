(() => {
  const STORAGE_KEY = "kasKelasTransactionsV1";
  const $ = (selector) => document.querySelector(selector);
  const formatRupiah = (value) => new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(value || 0);

  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  function getTransactions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch (error) {
      console.warn("Data kas tidak dapat dibaca dari browser.", error);
    }
    const sample = [
      {id: 1, date: "2026-10-08", description: "Iuran kelas", type: "income", amount: 500000},
      {id: 2, date: "2026-10-07", description: "Beli spidol", type: "expense", amount: 45000},
      {id: 3, date: "2026-10-05", description: "Kas bon acara", type: "income", amount: 200000},
      {id: 4, date: "2026-10-03", description: "Beli snack", type: "expense", amount: 120000},
      {id: 5, date: "2026-10-01", description: "Iuran kelas", type: "income", amount: 300000}
    ];
    saveTransactions(sample);
    return sample;
  }

  function saveTransactions(transactions) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
    catch (error) { console.warn("Browser tidak dapat menyimpan data.", error); }
  }

  function totals(transactions) {
    const income = transactions.filter(t => t.type === "income").reduce((sum,t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((sum,t) => sum + Number(t.amount), 0);
    return {income, expense, balance: income - expense};
  }

  function updateTotals(transactions) {
    const result = totals(transactions);
    document.querySelectorAll("#income-total").forEach(el => el.textContent = formatRupiah(result.income));
    document.querySelectorAll("#expense-total").forEach(el => el.textContent = formatRupiah(result.expense));
    document.querySelectorAll("#balance-total").forEach(el => el.textContent = formatRupiah(result.balance));
    const incomeSmall = $("#income-total-small"), expenseSmall = $("#expense-total-small"), balanceSmall = $("#balance-total-small");
    if (incomeSmall) incomeSmall.textContent = formatRupiah(result.income);
    if (expenseSmall) expenseSmall.textContent = formatRupiah(result.expense);
    if (balanceSmall) balanceSmall.textContent = formatRupiah(result.balance);
    const incomeCount = $("#income-count"), expenseCount = $("#expense-count");
    if (incomeCount) incomeCount.textContent = `${transactions.filter(t => t.type === "income").length} transaksi`;
    if (expenseCount) expenseCount.textContent = `${transactions.filter(t => t.type === "expense").length} transaksi`;
  }

  function readableDate(date) {
    if (!date) return "-";
    return new Intl.DateTimeFormat("id-ID", {day:"2-digit", month:"short", year:"numeric"}).format(new Date(`${date}T00:00:00`));
  }

  function renderTransactions(transactions) {
    const list = $("#transaction-list");
    if (!list) return;
    const filter = $("#transaction-filter")?.value || "all";
    const filtered = transactions.filter(t => filter === "all" || t.type === filter)
      .sort((a,b) => b.date.localeCompare(a.date) || b.id-a.id);
    list.replaceChildren();
    const empty = $("#empty-state");
    if (empty) empty.hidden = filtered.length > 0;
    filtered.forEach(t => {
      const row = document.createElement("tr");
      const values = [readableDate(t.date), t.description];
      values.forEach(value => { const cell = document.createElement("td"); cell.textContent = value; row.appendChild(cell); });
      const typeCell = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `type-pill ${t.type}`;
      pill.textContent = t.type === "income" ? "Pemasukan" : "Pengeluaran";
      typeCell.appendChild(pill); row.appendChild(typeCell);
      const amountCell = document.createElement("td");
      amountCell.className = `amount ${t.type}`;
      amountCell.textContent = `${t.type === "income" ? "+" : "−"} ${formatRupiah(t.amount)}`;
      row.appendChild(amountCell);
      const actionCell = document.createElement("td");
      const del = document.createElement("button");
      del.className = "delete-btn"; del.type = "button"; del.textContent = "Hapus";
      del.setAttribute("aria-label", `Hapus transaksi ${t.description}`);
      del.addEventListener("click", () => {
        if (!confirm(`Hapus transaksi "${t.description}"?`)) return;
        const next = getTransactions().filter(item => item.id !== t.id);
        saveTransactions(next); refresh();
      });
      actionCell.appendChild(del); row.appendChild(actionCell);
      list.appendChild(row);
    });
  }

  function renderChart(transactions) {
    const chart = $("#bar-chart");
    if (!chart) return;
    const result = totals(transactions);
    chart.replaceChildren();
    if (!transactions.length) {
      const msg = document.createElement("div"); msg.className = "bar-placeholder"; msg.textContent = "Belum ada transaksi untuk ditampilkan."; chart.appendChild(msg); return;
    }
    const grouped = {};
    transactions.forEach(t => {
      const key = t.date.slice(5);
      if (!grouped[key]) grouped[key] = {income:0, expense:0};
      grouped[key][t.type] += Number(t.amount);
    });
    const days = Object.keys(grouped).sort().slice(-6);
    const max = Math.max(1, ...days.flatMap(day => [grouped[day].income, grouped[day].expense]));
    days.forEach(day => {
      const group = document.createElement("div"); group.className = "bar-group";
      ["income","expense"].forEach(type => {
        const bar = document.createElement("div");
        bar.className = `bar ${type === "income" ? "income-bar" : "expense-bar"}`;
        bar.style.height = `${Math.max(3, grouped[day][type] / max * 88)}%`;
        bar.title = `${type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(grouped[day][type])}`;
        group.appendChild(bar);
      });
      const label = document.createElement("span"); label.className = "bar-label"; label.textContent = day; group.appendChild(label);
      chart.appendChild(group);
    });
  }

  function refresh() {
    const transactions = getTransactions();
    updateTotals(transactions);
    renderTransactions(transactions);
    renderChart(transactions);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".year").forEach(el => el.textContent = new Date().getFullYear());
    const dateInput = $("#transaction-date");
    if (dateInput) dateInput.value = localDate;
    const form = $("#transaction-form");
    if (form) form.addEventListener("submit", event => {
      event.preventDefault();
      const description = $("#transaction-description").value.trim();
      const date = $("#transaction-date").value;
      const type = $("#transaction-type").value;
      const amount = Number($("#transaction-amount").value);
      const message = $("#form-message");
      if (!description || !date || !Number.isFinite(amount) || amount <= 0) {
        if (message) message.textContent = "Periksa kembali tanggal, keterangan, dan nominal.";
        return;
      }
      const transactions = getTransactions();
      transactions.push({id: Date.now(), date, description, type, amount});
      saveTransactions(transactions);
      form.reset();
      if (dateInput) dateInput.value = localDate;
      if (message) message.textContent = "Transaksi berhasil disimpan!";
      refresh();
    });
    $("#transaction-filter")?.addEventListener("change", () => renderTransactions(getTransactions()));
    const menuButton = $(".menu-toggle"), nav = $(".nav");
    menuButton?.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    refresh();
  });
})();
