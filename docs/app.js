/* =========================================================
   Gestão Financeira — app.js
   App 100% local (IndexedDB). Sem backend, sem coleta de dados.
   ========================================================= */

(() => {
  "use strict";

  /* ---------- Constantes ---------- */
  const DB_NAME = "gestaoFinanceiraDB";
  const DB_VERSION = 1;
  const STORE_MESES = "meses";

  const MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Categorias que aceitam lançamento manual (Livre é sempre calculado)
  const CATEGORIES = [
    { key: "fixas",     match: "Contas Fixas",     label: "CONTAS FIXAS",     rowClass: "row-fixas",     chipClass: "cat-fixas",     base: "salario" },
    { key: "variaveis", match: "Contas Variáveis",  label: "CONTAS VARIÁVEIS", rowClass: "row-variaveis", chipClass: "cat-variaveis", base: "salario" },
    { key: "alelo",     match: "Alelo",             label: "ALELO",            rowClass: "row-alelo",     chipClass: "cat-alelo",     base: "aleloTotal" },
    { key: "guardar",   match: "Guardar",           label: "GUARDAR",          rowClass: "row-guardar",   chipClass: "cat-guardar",   base: "salario" },
  ];

  const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (n) => currencyFmt.format(Number.isFinite(n) ? n : 0);
  const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

  // Rótulo de exibição de uma categoria. "Alelo" pode ter nome
  // customizado por mês (definido em Ajustes); as demais são fixas.
  function getCategoryLabel(cat) {
    if (cat.key === "alelo" && currentMes && currentMes.aleloNome) {
      return currentMes.aleloNome.toUpperCase();
    }
    return cat.label;
  }

  function toTitleCase(text) {
    return text
      .split(" ")
      .map((w) => (w.length ? w[0] + w.slice(1).toLowerCase() : w))
      .join(" ");
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /* ---------- Estado em memória ---------- */
  let db = null;
  let currentDate = new Date();               // dia 1 do mês corrente selecionado
  currentDate.setDate(1);
  let currentMes = null;                       // registro do mês atual carregado do DB
  let activeDetailCategory = null;             // key da categoria em detalhe
  let selectedAddCategoria = null;              // match da categoria selecionada no form de add
  let editingLancamentoId = null;               // se estiver editando um lançamento existente

  /* ---------- Utilidades de DOM ---------- */
  const $ = (id) => document.getElementById(id);

  function mesId(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function monthLabel(date) {
    return `${MESES_PT[date.getMonth()]} ${date.getFullYear()}`;
  }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains(STORE_MESES)) {
          _db.createObjectStore(STORE_MESES, { keyPath: "mesId" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function idbGet(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function idbPut(store, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGetAll(store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getOrCreateMes(id) {
    let rec = await idbGet(STORE_MESES, id);
    if (!rec) {
      rec = { mesId: id, salario: 0, aleloTotal: 0, aleloNome: "Alelo", lancamentos: [] };
    }
    if (!Array.isArray(rec.lancamentos)) rec.lancamentos = [];
    if (!rec.aleloNome) rec.aleloNome = "Alelo";
    return rec;
  }

  async function findMostRecentMesBefore(id) {
    const all = await idbGetAll(STORE_MESES);
    const anteriores = all
      .filter((m) => m.mesId < id && (m.salario || m.aleloTotal))
      .sort((a, b) => (a.mesId < b.mesId ? 1 : -1));
    return anteriores[0] || null;
  }

  /* ---------- Geração de ID ----------
     crypto.randomUUID() só existe em "contexto seguro" (https:// ou
     localhost). Quando o app é acessado via IP da rede local em
     http:// (ex.: celular acessando o PC), essa API não existe —
     por isso sempre temos um fallback que funciona em qualquer
     situação. */
  function generateId() {
    if (window.isSecureContext && window.crypto && typeof window.crypto.randomUUID === "function") {
      try { return window.crypto.randomUUID(); } catch (err) { /* fallback abaixo */ }
    }
    return (
      "id-" + Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 10) + "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /* =========================================================
     CARREGAMENTO / NAVEGAÇÃO DE MÊS
     ========================================================= */
  async function loadMonth(date) {
    currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
    currentMes = await getOrCreateMes(mesId(currentDate));
    activeDetailCategory = null;
    showTotaisView();
    renderAll();
  }

  async function changeMonth(delta) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    await loadMonth(d);
  }

  /* =========================================================
     CÁLCULOS
     ========================================================= */
  function computeTotals(mes) {
    const totals = { fixas: 0, variaveis: 0, alelo: 0, guardar: 0 };
    for (const l of mes.lancamentos) {
      if (l.categoria === "Contas Fixas") totals.fixas += l.valor;
      else if (l.categoria === "Contas Variáveis") totals.variaveis += l.valor;
      else if (l.categoria === "Alelo") totals.alelo += l.valor;
      else if (l.categoria === "Guardar") totals.guardar += l.valor;
    }
    const salario = mes.salario || 0;
    const aleloTotal = mes.aleloTotal || 0;
    const livre = salario - (totals.fixas + totals.variaveis + totals.guardar);
    return { ...totals, salario, aleloTotal, livre };
  }

  /* =========================================================
     RENDER — HEADER (donut + legenda + barra alelo)
     ========================================================= */
  function renderHeader(totals) {
    $("month-label").textContent = monthLabel(currentDate);

    const { salario, fixas, variaveis, guardar, livre, alelo, aleloTotal } = totals;

    const pVariaveis = Math.max(0, pct(variaveis, salario));
    const pFixas = Math.max(0, pct(fixas, salario));
    const pGuardar = Math.max(0, pct(guardar, salario));
    const pLivre = Math.max(0, pct(livre, salario));

    $("legend-variaveis").textContent = `${pVariaveis}% variáveis`;
    $("legend-livre").textContent = `${pLivre}% livres`;
    $("legend-fixas").textContent = `${pFixas}% fixas`;
    $("legend-guardar").textContent = `${pGuardar}% guardar`;

    $("donut-salario").textContent = fmt(salario);

    if (salario > 0) {
      let acc = 0;
      const seg = (p) => {
        const start = acc;
        acc += p;
        return [start, acc];
      };
      const [v0, v1] = seg(pVariaveis);
      const [l0, l1] = seg(pLivre);
      const [f0, f1] = seg(pFixas);
      const [g0, g1] = seg(pGuardar);
      const remainderColor = "var(--text-muted)";
      $("donut").style.background = `conic-gradient(
        var(--color-variaveis-1) ${v0}% ${v1}%,
        var(--color-livre-1) ${l0}% ${l1}%,
        var(--color-fixas-1) ${f0}% ${f1}%,
        var(--color-guardar-1) ${g0}% ${g1}%,
        ${remainderColor} ${g1}% 100%
      )`;
    } else {
      $("donut").style.background = "conic-gradient(var(--text-muted) 0% 100%)";
    }

    const aleloPct = pct(alelo, aleloTotal);
    $("alelo-fill").style.width = `${Math.min(100, aleloPct)}%`;
    $("alelo-name-label").textContent = (currentMes && currentMes.aleloNome) || "Alelo";
    $("alelo-pct").textContent = `${aleloPct}%`;
    $("alelo-total-label").textContent = fmt(aleloTotal);
  }

  /* =========================================================
     RENDER — PAINEL TOTAIS (lista de categorias)
     ========================================================= */
  function renderTotaisList(totals) {
    const { livre, salario } = totals;
    $("livre-valor").textContent = fmt(livre);
    $("livre-badge").textContent = `${pct(livre, salario)}% disponível`;

    const list = $("category-list");
    list.innerHTML = "";

    for (const cat of CATEGORIES) {
      const value = totals[cat.key];
      const base = cat.base === "aleloTotal" ? totals.aleloTotal : totals.salario;
      const row = document.createElement("div");
      row.className = `total-row ${cat.rowClass}`;
      row.innerHTML = `
        <div class="total-row-main">
          <span class="total-row-label">${getCategoryLabel(cat)}</span>
          <span class="total-row-value">${fmt(value)}</span>
        </div>
        <span class="total-row-badge">${pct(value, base)}%<br>do total</span>
      `;
      row.addEventListener("click", () => openCategoryDetail(cat.key));
      list.appendChild(row);
    }
  }

  /* =========================================================
     RENDER — DETALHE DE CATEGORIA
     ========================================================= */
  function openCategoryDetail(catKey) {
    activeDetailCategory = catKey;
    renderCategoryDetail();
    $("category-list").classList.add("hidden");
    $("livre-row").classList.add("hidden");
    $("category-detail").classList.remove("hidden");
    $("panel-title").textContent = toTitleCase(getCategoryLabel(CATEGORIES.find((c) => c.key === catKey)));
  }

  function closeCategoryDetail() {
    activeDetailCategory = null;
    $("category-detail").classList.add("hidden");
    $("category-list").classList.remove("hidden");
    $("livre-row").classList.remove("hidden");
    $("panel-title").textContent = "Totais";
  }

  function renderCategoryDetail() {
    if (!activeDetailCategory) return;
    const cat = CATEGORIES.find((c) => c.key === activeDetailCategory);
    const totals = computeTotals(currentMes);
    const value = totals[cat.key];
    const base = cat.base === "aleloTotal" ? totals.aleloTotal : totals.salario;

    const summaryRow = $("detail-summary-row");
    summaryRow.className = `total-row ${cat.rowClass}`;
    $("detail-label").textContent = getCategoryLabel(cat);
    $("detail-valor").textContent = fmt(value);
    $("detail-badge").innerHTML = `${pct(value, base)}%<br>do total`;

    const items = currentMes.lancamentos
      .map((l, idx) => ({ ...l, idx }))
      .filter((l) => l.categoria === cat.match);

    const listEl = $("detail-list");
    listEl.innerHTML = "";
    $("detail-empty").classList.toggle("hidden", items.length > 0);

    items.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "lancamento-item";
      const label = item.nome && item.nome.trim() ? escapeHtml(item.nome.trim()) : `Lançamento ${i + 1}`;
      li.innerHTML = `
        <span>${label}</span>
        <span class="lanc-value">${fmt(item.valor)}</span>
        <span class="lanc-actions">
          <button class="lanc-btn edit" title="Editar" data-id="${item.id}">✎</button>
          <button class="lanc-btn delete" title="Excluir" data-id="${item.id}">🗑</button>
        </span>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll(".lanc-btn.edit").forEach((btn) => {
      btn.addEventListener("click", () => startEditLancamento(btn.dataset.id, cat.match));
    });
    listEl.querySelectorAll(".lanc-btn.delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteLancamento(btn.dataset.id));
    });
  }

  async function deleteLancamento(id) {
    const ok = confirm("Excluir este lançamento?");
    if (!ok) return;
    currentMes.lancamentos = currentMes.lancamentos.filter((l) => l.id !== id);
    await idbPut(STORE_MESES, currentMes);
    renderAll();
    if (activeDetailCategory) renderCategoryDetail();
  }

  function startEditLancamento(id, categoriaMatch) {
    const lanc = currentMes.lancamentos.find((l) => l.id === id);
    if (!lanc) return;
    editingLancamentoId = id;
    openAddForm();
    $("add-valor").value = lanc.valor;
    $("add-nome").value = lanc.nome || "";
    setSelectedCategoria(categoriaMatch);
    $("add-submit").textContent = "Salvar alterações";
  }

  /* =========================================================
     RENDER — AJUSTES
     ========================================================= */
  function openAjustes() {
    $("category-list").classList.add("hidden");
    $("category-detail").classList.add("hidden");
    $("livre-row").classList.add("hidden");
    $("ajustes-form").classList.remove("hidden");
    $("panel-title").textContent = "Ajustes";
    $("ajustes-salario").value = currentMes.salario || "";
    $("ajustes-alelo-nome").value = currentMes.aleloNome || "Alelo";
    $("ajustes-alelo").value = currentMes.aleloTotal || "";
    $("ajustes-saved-msg").classList.add("hidden");
  }

  function closeAjustes() {
    $("ajustes-form").classList.add("hidden");
    $("category-list").classList.remove("hidden");
    $("livre-row").classList.remove("hidden");
    $("panel-title").textContent = "Totais";
  }

  async function saveAjustes() {
    const salario = parseFloat($("ajustes-salario").value) || 0;
    const aleloTotal = parseFloat($("ajustes-alelo").value) || 0;
    const aleloNome = $("ajustes-alelo-nome").value.trim() || "Alelo";
    currentMes.salario = salario;
    currentMes.aleloTotal = aleloTotal;
    currentMes.aleloNome = aleloNome;
    await idbPut(STORE_MESES, currentMes);
    $("ajustes-saved-msg").classList.remove("hidden");
    renderAll();
  }

  async function copyPrevMonth() {
    const prev = await findMostRecentMesBefore(mesId(currentDate));
    if (!prev) {
      alert("Não encontrei nenhum mês anterior com valores definidos.");
      return;
    }
    $("ajustes-salario").value = prev.salario || 0;
    $("ajustes-alelo-nome").value = prev.aleloNome || "Alelo";
    $("ajustes-alelo").value = prev.aleloTotal || 0;
  }

  /* =========================================================
     RENDER — PAINEL ADICIONAR LANÇAMENTO
     ========================================================= */
  function renderCategoriaChips() {
    const wrap = $("add-categoria-options");
    wrap.innerHTML = "";
    for (const cat of CATEGORIES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `categoria-chip ${cat.chipClass}`;
      chip.textContent = toTitleCase(getCategoryLabel(cat));
      chip.dataset.match = cat.match;
      chip.addEventListener("click", () => setSelectedCategoria(cat.match));
      wrap.appendChild(chip);
    }
    if (selectedAddCategoria) setSelectedCategoria(selectedAddCategoria);
  }

  function setSelectedCategoria(match) {
    selectedAddCategoria = match;
    document.querySelectorAll(".categoria-chip").forEach((chip) => {
      chip.classList.toggle("selected", chip.dataset.match === match);
    });
  }

  function openAddForm() {
    $("panel-totais").classList.add("hidden");
    $("btn-toggle-add").classList.add("hidden");
    $("add-form").classList.remove("hidden");
    $("add-error").classList.add("hidden");
    if (!editingLancamentoId) {
      $("add-valor").value = "";
      $("add-nome").value = "";
      setSelectedCategoria(CATEGORIES[0].match);
      $("add-submit").textContent = "Adicionar";
    }
  }

  function closeAddForm() {
    $("panel-totais").classList.remove("hidden");
    $("btn-toggle-add").classList.remove("hidden");
    $("add-form").classList.add("hidden");
    editingLancamentoId = null;
  }

  function showTotaisView() {
    closeAddForm();
    closeAjustes();
    closeCategoryDetail();
  }

  async function submitAddForm() {
    const errorEl = $("add-error");
    errorEl.classList.add("hidden");
    const valor = parseFloat($("add-valor").value);

    if (!valor || valor <= 0) {
      errorEl.textContent = "Informe um valor válido maior que zero.";
      errorEl.classList.remove("hidden");
      return;
    }
    if (!selectedAddCategoria) {
      errorEl.textContent = "Selecione uma categoria.";
      errorEl.classList.remove("hidden");
      return;
    }

    const nome = $("add-nome").value.trim();

    if (editingLancamentoId) {
      const lanc = currentMes.lancamentos.find((l) => l.id === editingLancamentoId);
      if (lanc) {
        lanc.valor = valor;
        lanc.categoria = selectedAddCategoria;
        lanc.nome = nome;
      }
    } else {
      currentMes.lancamentos.push({
        id: generateId(),
        valor,
        categoria: selectedAddCategoria,
        nome,
        timestamp: Date.now(),
      });
    }

    await idbPut(STORE_MESES, currentMes);
    editingLancamentoId = null;
    closeAddForm();
    renderAll();
  }

  /* =========================================================
     RENDER GERAL
     ========================================================= */
  function renderAll() {
    const totals = computeTotals(currentMes);
    renderHeader(totals);
    renderTotaisList(totals);
    renderCategoriaChips();
    if (activeDetailCategory) renderCategoryDetail();
  }

  /* =========================================================
     EVENTOS
     ========================================================= */
  function bindEvents() {
    $("month-prev").addEventListener("click", () => changeMonth(-1));
    $("month-next").addEventListener("click", () => changeMonth(1));

    $("btn-ajustes").addEventListener("click", openAjustes);
    $("btn-back-ajustes").addEventListener("click", closeAjustes);
    $("ajustes-save").addEventListener("click", saveAjustes);
    $("ajustes-copy-prev").addEventListener("click", copyPrevMonth);

    $("btn-back-detail").addEventListener("click", closeCategoryDetail);

    $("btn-toggle-add").addEventListener("click", openAddForm);
    $("btn-back-add").addEventListener("click", closeAddForm);
    $("add-submit").addEventListener("click", submitAddForm);
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */
  async function init() {
    try {
      db = await openDB();
    } catch (err) {
      alert("Não foi possível iniciar o banco de dados local neste navegador.");
      return;
    }
    bindEvents();
    $("screen-main").classList.add("active");
    await loadMonth(currentDate);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
