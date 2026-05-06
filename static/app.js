const EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function $(id) {
  return document.getElementById(id);
}

/** Hero summary fields that must stay in sync when loading fails or data is missing. */
const SUMMARY_IDS = [
  "el-today",
  "el-savings",
  "el-fixed-sum",
  "el-spent-var",
  "el-remain",
  "el-days",
];

function clearSummaryFields() {
  for (const id of SUMMARY_IDS) {
    const el = $(id);
    if (el) el.textContent = "—";
  }
}

function moneyOrDash(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return EUR.format(n);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("visible"), 2800);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = Array.isArray(body.detail) ? body.detail.map((d) => d.msg || d).join(", ") : String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail || "Error de red");
  }
  if (res.status === 204) return null;
  return res.json();
}

function renderSummary(data) {
  const pct = Number(data.savings_percent);
  const savingStr = moneyOrDash(data.savings_amount);
  const savingsBlock =
    savingStr === "—"
      ? "—"
      : pct > 0
        ? `${savingStr} (${pct} % del ingreso)`
        : `${savingStr} (0 % del ingreso)`;

  const set = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  set("el-today", moneyOrDash(data.suggested_spend_today));
  set("el-savings", savingsBlock);
  set("el-fixed-sum", moneyOrDash(data.fixed_expenses_total));
  set("el-spent-var", moneyOrDash(data.variable_spent_month));
  set("el-remain", moneyOrDash(data.remaining_this_month));
  const days = data.days_remaining_in_month;
  set("el-days", days != null && days !== "" ? String(days) : "—");
}

function renderFixed(items) {
  const ul = $("list-fixed");
  ul.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(it.name)}</strong>
        <div class="meta">${EUR.format(Number(it.amount))}</div>
      </div>
      <button type="button" class="danger" data-action="del-fixed" data-id="${it.id}">Quitar</button>
    `;
    ul.appendChild(li);
  }
}

function renderExpenses(items) {
  const ul = $("list-expenses");
  ul.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.className = "item";
    const note = it.note ? ` · ${escapeHtml(it.note)}` : "";
    li.innerHTML = `
      <div>
        <strong>${EUR.format(Number(it.amount))}</strong>
        <div class="meta">${it.occurred_at}${note}</div>
      </div>
      <button type="button" class="danger" data-action="del-exp" data-id="${it.id}">Borrar</button>
    `;
    ul.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadAll() {
  const [summary, settings, fixed, expenses] = await Promise.all([
    api("/api/summary"),
    api("/api/settings"),
    api("/api/fixed-expenses"),
    api("/api/expenses"),
  ]);
  renderSummary(summary);
  $("inp-income").value = Number(settings.monthly_income);
  $("inp-savings").value = Number(settings.savings_percent);
  renderFixed(fixed);
  renderExpenses(expenses);
}

async function main() {
  $("btn-refresh").addEventListener("click", async () => {
    try {
      await loadAll();
      toast("Listo");
    } catch (e) {
      toast(String(e.message || e));
    }
  });

  $("form-settings").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: fd.get("monthly_income"),
          savings_percent: fd.get("savings_percent"),
        }),
      });
      await loadAll();
      toast("Configuración guardada");
    } catch (e) {
      toast(String(e.message || e));
    }
  });

  $("form-fixed-add").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      await api("/api/fixed-expenses", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          amount: fd.get("amount"),
        }),
      });
      ev.target.reset();
      await loadAll();
      toast("Gasto fijo añadido");
    } catch (e) {
      toast(String(e.message || e));
    }
  });

  $("form-expense").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const note = String(fd.get("note") || "").trim();
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: fd.get("amount"),
          note: note || null,
        }),
      });
      ev.target.reset();
      await loadAll();
      toast("Gasto registrado");
    } catch (e) {
      toast(String(e.message || e));
    }
  });

  document.body.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    try {
      if (action === "del-fixed") {
        await api(`/api/fixed-expenses/${id}`, { method: "DELETE" });
        toast("Gasto fijo quitado");
      }
      if (action === "del-exp") {
        await api(`/api/expenses/${id}`, { method: "DELETE" });
        toast("Gasto borrado");
      }
      await loadAll();
    } catch (e) {
      toast(String(e.message || e));
    }
  });

  try {
    await loadAll();
  } catch (e) {
    toast(String(e.message || e));
    clearSummaryFields();
  }
}

main();
