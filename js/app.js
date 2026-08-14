import { CATEGORIES, CATEGORY_MAP, DAY_MS, toDateStr, parseDateStr, startOfDay, fmtMin, esc, uid } from './util.js';
import { getAllActivities, addActivity, deleteActivity, clearStore, putMany } from './db.js';
import { stackedBars, donut, heatmap, legend, fmtShortMin } from './charts.js';

const COLORS = CATEGORIES.map((c) => c.color);
const CAT_LABELS = CATEGORIES.map((c) => c.label);

const state = {
  view: 'today',
  activities: [],
  todayDate: toDateStr(new Date()),
  statsMode: 'day',
  statsAnchor: startOfDay(new Date()).getTime()
};

const $ = (sel) => document.querySelector(sel);

const els = {
  todayPrev: $('#today-prev'),
  todayDate: $('#today-date'),
  todayNext: $('#today-next'),
  todayNow: $('#today-now'),
  todaySummary: $('#today-summary'),
  todayChart: $('#today-chart'),
  todayAdd: $('#today-add'),
  todayList: $('#today-list'),
  statsModeBtns: [...document.querySelectorAll('#stats-mode .seg-btn')],
  statsPrev: $('#stats-prev'),
  statsRange: $('#stats-range'),
  statsNext: $('#stats-next'),
  statsNow: $('#stats-now'),
  statsSummary: $('#stats-summary'),
  statsCharts: $('#stats-charts'),
  dataOverview: $('#data-overview'),
  exportJson: $('#export-json'),
  exportCsv: $('#export-csv'),
  importFile: $('#import-file'),
  importJson: $('#import-json'),
  clearData: $('#clear-data'),
  modal: $('#modal'),
  modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'),
  modalClose: $('#modal-close'),
  toast: $('#toast')
};

// ---------- 基础工具 ----------

function totals(acts) {
  const t = { main: 0, extra: 0, leisure: 0, fun: 0, total: 0, effective: 0 };
  for (const a of acts) {
    t[a.category] += a.durationMin;
    t.total += a.durationMin;
  }
  t.effective = t.main + t.extra;
  return t;
}

function sumOf(list) {
  return list.reduce((acc, t) => {
    acc.main += t.main;
    acc.extra += t.extra;
    acc.leisure += t.leisure;
    acc.fun += t.fun;
    acc.total += t.total;
    acc.effective += t.effective;
    return acc;
  }, { main: 0, extra: 0, leisure: 0, fun: 0, total: 0, effective: 0 });
}

function dayActs(dayMs) {
  return state.activities
    .filter((a) => a.startTime >= dayMs && a.startTime < dayMs + DAY_MS)
    .sort((a, b) => a.startTime - b.startTime);
}

function addDays(d, n) {
  return new Date(d.getTime() + n * DAY_MS);
}

function summaryInner(t, extra = []) {
  const base = [
    ['主要工作', fmtShortMin(t.main), 'var(--main)'],
    ['附加工作', fmtShortMin(t.extra), 'var(--extra)'],
    ['休闲', fmtShortMin(t.leisure), 'var(--leisure)'],
    ['娱乐', fmtShortMin(t.fun), 'var(--fun)'],
    ['有效时间', fmtShortMin(t.effective), 'var(--primary)']
  ];
  const all = base.concat(extra.map((e) => [e.label, e.val, '']));
  return all
    .map(
      ([label, val, color]) =>
        `<div class="card mini"><div class="mini-label">${label}</div><div class="mini-val"${color ? ` style="color:${color}"` : ''}>${val}</div></div>`
    )
    .join('');
}

function recordRow(a, withActions = true) {
  const cat = CATEGORY_MAP[a.category];
  const chip = `<span class="chip" style="background:${cat.color}1f;color:${cat.color}">${cat.label}</span>`;
  const actions = withActions
    ? `<div class="record-actions"><button class="btn tiny" data-action="edit">编辑</button><button class="btn tiny danger" data-action="del">删除</button></div>`
    : '';
  return `<div class="record" data-id="${a.id}">
    <div class="record-head">${chip}<span class="record-dur">${fmtShortMin(a.durationMin)}</span></div>
    <div class="record-title">${esc(a.title)}</div>
    ${a.note ? `<div class="record-note">${esc(a.note)}</div>` : ''}
    ${actions}
  </div>`;
}

// ---------- 初始化 ----------

async function init() {
  state.activities = await getAllActivities();
  els.todayDate.value = state.todayDate;
  bindEvents();
  renderAll();
  registerSW();
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));

  els.todayPrev.addEventListener('click', () => shiftDate(-1));
  els.todayNext.addEventListener('click', () => shiftDate(1));
  els.todayNow.addEventListener('click', () => {
    els.todayDate.value = toDateStr(new Date());
    renderToday();
  });
  els.todayDate.addEventListener('change', renderToday);
  els.todayAdd.addEventListener('click', () => openRecordModal(null));
  els.todayList.addEventListener('click', todayListClick);

  els.statsModeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      state.statsMode = b.dataset.mode;
      els.statsModeBtns.forEach((x) => x.classList.toggle('active', x === b));
      state.statsAnchor = normalizeAnchor();
      renderStats();
    })
  );
  els.statsPrev.addEventListener('click', () => {
    state.statsAnchor = shiftAnchor(-1);
    renderStats();
  });
  els.statsNext.addEventListener('click', () => {
    state.statsAnchor = shiftAnchor(1);
    renderStats();
  });
  els.statsNow.addEventListener('click', () => {
    state.statsAnchor = normalizeAnchor();
    renderStats();
  });

  els.exportJson.addEventListener('click', exportJSON);
  els.exportCsv.addEventListener('click', exportCSV);
  els.importJson.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', importJSON);
  els.clearData.addEventListener('click', clearAll);

  els.modalClose.addEventListener('click', closeModal);
  $('.modal-mask').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function registerSW() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ---------- 视图切换 ----------

function switchView(v) {
  state.view = v;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('hidden', s.id !== 'view-' + v));
  renderView(v);
}

function renderView(v) {
  const map = {
    today: renderToday,
    stats: renderStats,
    data: renderData
  };
  map[v]();
}

function renderAll() {
  renderView(state.view);
}

// ---------- 今日视图 ----------

function shiftDate(dir) {
  const d = parseDateStr(els.todayDate.value);
  d.setDate(d.getDate() + dir);
  els.todayDate.value = toDateStr(d);
  renderToday();
}

function renderToday() {
  const dayMs = parseDateStr(els.todayDate.value).getTime();
  const acts = dayActs(dayMs);
  const t = totals(acts);
  els.todaySummary.innerHTML = summaryInner(t);
  els.todayChart.innerHTML = acts.length
    ? donut([t.main, t.extra, t.leisure, t.fun], COLORS, fmtShortMin(t.total), '总时长') + legend(COLORS, CAT_LABELS)
    : '<p class="empty">这一天还没有记录</p>';
  els.todayList.innerHTML = acts.length
    ? acts.map((a) => recordRow(a)).join('')
    : '<p class="empty">暂无记录，点击上方按钮添加</p>';
}

async function todayListClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const row = e.target.closest('[data-id]');
  const rec = state.activities.find((a) => a.id === row.dataset.id);
  if (!rec) return;
  if (btn.dataset.action === 'edit') {
    openRecordModal(rec);
  } else if (btn.dataset.action === 'del') {
    if (!confirm(`删除记录「${rec.title}」？`)) return;
    await deleteActivity(rec.id);
    state.activities = state.activities.filter((a) => a.id !== rec.id);
    renderAll();
    toast('已删除');
  }
}

function openRecordModal(rec) {
  const date = rec ? toDateStr(new Date(rec.startTime)) : els.todayDate.value;
  const catOpts = CATEGORIES.map((c) => `<option value="${c.key}" ${!rec || rec.category === c.key ? 'selected' : ''}>${c.label}</option>`).join('');
  openModal(rec ? '编辑记录' : '添加记录', `
    <form id="record-form">
      <label class="field">日期<input class="input" id="f-date" type="date" value="${date}"></label>
      <label class="field">时长（分钟）<input class="input" id="f-dur" type="number" min="1" max="1440" value="${rec ? rec.durationMin : 30}"></label>
      <label class="field">分类<select class="input" id="f-cat">${catOpts}</select></label>
      <label class="field">标题<input class="input" id="f-title" maxlength="60" value="${rec ? esc(rec.title) : ''}" placeholder="做了什么？"></label>
      <label class="field">备注<input class="input" id="f-note" maxlength="200" value="${rec ? esc(rec.note || '') : ''}"></label>
      <button class="btn primary block" type="submit">保存</button>
    </form>`, () => {
    $('#record-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dateStr = $('#f-date').value;
      if (!dateStr) {
        toast('请填写日期');
        return;
      }
      const durMin = parseInt($('#f-dur').value, 10);
      if (!Number.isFinite(durMin) || durMin <= 0) {
        toast('时长需为大于 0 的分钟数');
        return;
      }
      const startMs = parseDateStr(dateStr).getTime();
      const recObj = {
        id: rec ? rec.id : uid(),
        startTime: startMs,
        endTime: startMs + durMin * 60000,
        durationMin: durMin,
        category: $('#f-cat').value,
        title: $('#f-title').value.trim() || CATEGORY_MAP[$('#f-cat').value].label,
        note: $('#f-note').value.trim()
      };
      if (rec) {
        await deleteActivity(rec.id);
        const idx = state.activities.findIndex((a) => a.id === rec.id);
        if (idx >= 0) state.activities[idx] = recObj;
      } else {
        state.activities.push(recObj);
      }
      await addActivity(recObj);
      closeModal();
      renderAll();
      toast('已保存');
    });
  });
}

// ---------- 统计 ----------

function normalizeAnchor() {
  const d = new Date(state.statsAnchor);
  if (state.statsMode === 'week') {
    const mon = addDays(startOfDay(d), -((d.getDay() + 6) % 7));
    return mon.getTime();
  }
  if (state.statsMode === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  if (state.statsMode === 'year') return new Date(d.getFullYear(), 0, 1).getTime();
  return startOfDay(d).getTime();
}

function shiftAnchor(dir) {
  const d = new Date(state.statsAnchor);
  if (state.statsMode === 'day') return d.getTime() + dir * DAY_MS;
  if (state.statsMode === 'week') return d.getTime() + dir * 7 * DAY_MS;
  if (state.statsMode === 'month') return new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime();
  return new Date(d.getFullYear() + dir, 0, 1).getTime();
}

function renderStats() {
  const d = new Date(state.statsAnchor);
  const day = state.statsMode === 'day';
  const week = state.statsMode === 'week';
  const month = state.statsMode === 'month';
  const year = state.statsMode === 'year';

  if (day) {
    els.statsRange.textContent = toDateStr(d);
    const acts = dayActs(d.getTime());
    const t = totals(acts);
    els.statsSummary.innerHTML = summaryInner(t);
    els.statsCharts.innerHTML =
      `<div class="card chart">${
        acts.length
          ? donut([t.main, t.extra, t.leisure, t.fun], COLORS, fmtShortMin(t.total), '总时长') + legend(COLORS, CAT_LABELS)
          : '<p class="empty">当天没有记录</p>'
      }</div>` +
      (acts.length ? `<div class="card"><h3>记录明细</h3>${acts.map((a) => recordRow(a, false)).join('')}</div>` : '');
  } else if (week) {
    const mon = addDays(startOfDay(d), -((d.getDay() + 6) % 7));
    els.statsRange.textContent = `${toDateStr(mon)} ～ ${toDateStr(addDays(mon, 6))}`;
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const perDay = days.map((day2) => totals(dayActs(day2.getTime())));
    const t = sumOf(perDay);
    els.statsSummary.innerHTML = summaryInner(t, [{ label: '总时长', val: fmtShortMin(t.total) }]);
    els.statsCharts.innerHTML = `<div class="card chart"><h3>本周每日时长</h3>${
      stackedBars(perDay.map((x) => [x.main, x.extra, x.leisure, x.fun]), COLORS, days.map((x) => String(x.getDate()))) + legend(COLORS, CAT_LABELS)
    }</div>`;
  } else if (month) {
    const y = d.getFullYear();
    const m = d.getMonth();
    els.statsRange.textContent = `${y}年${m + 1}月`;
    const dim = new Date(y, m + 1, 0).getDate();
    const perDay = Array.from({ length: dim }, (_, i) => {
      const dayMs = new Date(y, m, i + 1).getTime();
      return totals(dayActs(dayMs));
    });
    const t = sumOf(perDay);
    const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ label: '', value: 0 });
    perDay.forEach((x, i) => cells.push({ label: String(i + 1), value: x.total }));
    els.statsSummary.innerHTML = summaryInner(t, [
      { label: '总时长', val: fmtShortMin(t.total) },
      { label: '日均', val: fmtShortMin(Math.round(t.total / dim)) },
      { label: '主要日均', val: fmtShortMin(Math.round(t.main / dim)) }
    ]);
    els.statsCharts.innerHTML =
      `<div class="card chart"><h3>${y}年${m + 1}月热力图</h3>${heatmap(cells)}</div>` +
      `<div class="card chart"><h3>每日分类时长</h3>${
        stackedBars(perDay.map((x) => [x.main, x.extra, x.leisure, x.fun]), COLORS, perDay.map((_, i) => (i % 2 === 0 ? String(i + 1) : ''))) + legend(COLORS, CAT_LABELS)
      }</div>`;
  } else {
    const y = d.getFullYear();
    els.statsRange.textContent = `${y}年`;
    const months = Array.from({ length: 12 }, (_, m) => {
      const dim = new Date(y, m + 1, 0).getDate();
      const s = new Date(y, m, 1).getTime();
      return totals(state.activities.filter((a) => a.startTime >= s && a.startTime < s + dim * DAY_MS));
    });
    const t = sumOf(months);
    els.statsSummary.innerHTML = summaryInner(t, [
      { label: '总时长', val: fmtShortMin(t.total) },
      { label: '日均', val: fmtShortMin(Math.round(t.total / 365)) },
      { label: '主要占比', val: t.total ? Math.round((t.main / t.total) * 100) + '%' : '—' }
    ]);
    els.statsCharts.innerHTML =
      `<div class="card chart"><h3>${y}年每月分类时长</h3>${
        stackedBars(months.map((x) => [x.main, x.extra, x.leisure, x.fun]), COLORS, months.map((_, i) => `${i + 1}月`)) + legend(COLORS, CAT_LABELS)
      }</div>` + monthTable(y, months);
  }
}

function monthTable(y, months) {
  const rows = months
    .map(
      (x, i) =>
        `<tr><td>${i + 1}月</td><td>${fmtShortMin(x.main)}</td><td>${fmtShortMin(x.extra)}</td><td>${fmtShortMin(x.leisure)}</td><td>${fmtShortMin(x.fun)}</td><td>${fmtShortMin(x.total)}</td></tr>`
    )
    .join('');
  return `<div class="card"><h3>${y}年按月明细</h3><table class="month-table"><thead><tr><th>月份</th><th>主要</th><th>附加</th><th>休闲</th><th>娱乐</th><th>合计</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------- 数据管理 ----------

function renderData() {
  const totalMin = state.activities.reduce((s, a) => s + a.durationMin, 0);
  const n = state.activities.length;
  const first = n ? new Date(Math.min(...state.activities.map((a) => a.startTime))) : null;
  const last = n ? new Date(Math.max(...state.activities.map((a) => a.startTime))) : null;
  els.dataOverview.innerHTML = `
    <div class="stat-line">记录条数：${n}</div>
    <div class="stat-line">累计时长：${fmtMin(totalMin)}</div>
    <div class="stat-line">记录范围：${first ? `${toDateStr(first)} ～ ${toDateStr(last)}` : '暂无'}</div>`;
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    activities: state.activities
  };
  download(`lyubishchev-backup-${toDateStr(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('已导出 JSON 备份');
}

function exportCSV() {
  const rows = [['日期', '时长(分钟)', '分类', '标题', '备注']];
  const sorted = [...state.activities].sort((a, b) => a.startTime - b.startTime);
  for (const a of sorted) {
    rows.push([
      toDateStr(new Date(a.startTime)),
      a.durationMin,
      CATEGORY_MAP[a.category].label,
      a.title,
      a.note || ''
    ]);
  }
  const csv =
    '\uFEFF' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download(`lyubishchev-records-${toDateStr(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  toast('已导出 CSV');
}

async function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.activities)) {
      throw new Error('文件格式不正确（缺少 activities）');
    }
    if (!confirm(`导入将替换当前全部数据（当前 ${state.activities.length} 条记录）。是否继续？`)) return;
    await clearStore('activities');
    await putMany('activities', data.activities);
    state.activities = await getAllActivities();
    renderAll();
    toast('导入成功');
  } catch (err) {
    alert('导入失败：' + err.message);
  }
  e.target.value = '';
}

async function clearAll() {
  if (!confirm('此操作将删除全部记录，且无法恢复。是否继续？')) return;
  if (prompt('请输入「确认删除」以继续') !== '确认删除') return;
  await clearStore('activities');
  state.activities = [];
  renderAll();
  toast('已清空全部数据');
}

// ---------- 弹窗与提示 ----------

function openModal(title, body, onReady) {
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = body;
  els.modal.classList.remove('hidden');
  if (onReady) onReady();
}

function closeModal() {
  els.modal.classList.add('hidden');
  els.modalBody.innerHTML = '';
}

let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2200);
}

init();
