// 手写 SVG 图表
export function fmtShortMin(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}m`;
}

export function niceMax(v) {
  if (v <= 0) return 60;
  const steps = [15, 30, 60, 120, 180, 240, 360, 480, 600, 720, 960, 1200, 1440];
  for (const s of steps) {
    if (v <= s) return s;
  }
  return Math.ceil(v / 240) * 240;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// 堆叠柱状图；data 为每项数值数组，colors 与数值顺序对应
export function stackedBars(data, colors, labels) {
  const n = data.length;
  const padL = 42;
  const padB = 24;
  const padT = 10;
  const H = 200;
  const W = Math.max(320, n * 38 + padL + 10);
  const max = niceMax(Math.max(1, ...data.map((vals) => vals.reduce((a, b) => a + b, 0))));
  const plotW = W - padL - 10;
  const plotH = H - padT - padB;
  const slot = plotW / n;
  const bw = Math.max(6, slot * 0.6);

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for (let g = 0; g <= 4; g++) {
    const val = (max * g) / 4;
    const y = padT + plotH * (1 - g / 4);
    s += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - 5}" y2="${y.toFixed(1)}" class="grid"/>`;
    s += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" class="axis" text-anchor="end" font-size="10">${fmtShortMin(val)}</text>`;
  }
  data.forEach((vals, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    let acc = 0;
    vals.forEach((v, j) => {
      if (v <= 0) return;
      const h = (v / max) * plotH;
      const y = padT + plotH - acc - h;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${colors[j]}" rx="1.5"/>`;
      acc += h;
    });
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" class="axis" text-anchor="middle" font-size="10">${escAttr(labels[i])}</text>`;
  });
  return s + '</svg>';
}

// 环形占比图
export function donut(values, colors, centerTop, centerBottom) {
  const r = 70;
  const cx = 90;
  const cy = 90;
  const C = 2 * Math.PI * r;
  const total = values.reduce((a, b) => a + b, 0);
  let s = '<svg viewBox="0 0 180 180" role="img">';
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" class="donut-track"/>`;
  if (total > 0) {
    let off = 0;
    values.forEach((v, i) => {
      if (v <= 0) return;
      const frac = v / total;
      const dash = frac * C;
      const gap = C - dash + 2;
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="26" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      off += dash;
    });
  }
  s += `<text x="${cx}" y="${cy - 4}" class="donut-center" text-anchor="middle">${escAttr(centerTop)}</text>`;
  s += `<text x="${cx}" y="${cy + 16}" class="donut-sub" text-anchor="middle">${escAttr(centerBottom)}</text>`;
  return s + '</svg>';
}

// 日历热力图；days: [{label, value}]
export function heatmap(days) {
  const cols = 7;
  const cell = 32;
  const gap = 6;
  const rows = Math.max(1, Math.ceil(days.length / cols));
  const W = cols * (cell + gap) + gap;
  const H = rows * (cell + gap) + gap + 18;
  const max = Math.max(1, ...days.map((d) => d.value));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  ['一', '二', '三', '四', '五', '六', '日'].forEach((w, i) => {
    s += `<text x="${gap + i * (cell + gap) + cell / 2}" y="12" class="axis" text-anchor="middle" font-size="11">${w}</text>`;
  });
  days.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (cell + gap);
    const y = 18 + gap + row * (cell + gap);
    const frac = d.value > 0 ? Math.min(1, d.value / max) : 0;
    const fill = d.value === 0 ? 'var(--heat-empty)' : mix('#93c5fd', '#1d4ed8', frac);
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="6" fill="${fill}"/>`;
    const tcol = frac > 0.55 ? '#ffffff' : 'var(--text)';
    s += `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" class="heat-text" text-anchor="middle" font-size="11" fill="${tcol}">${escAttr(d.label)}</text>`;
  });
  return s + '</svg>';
}

function mix(c1, c2, f) {
  const a = hex(c1);
  const b = hex(c2);
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

export function legend(colors, labels) {
  return `<div class="legend">${colors
    .map(
      (c, i) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${c}"></span>${escAttr(labels[i])}</span>`
    )
    .join('')}</div>`;
}
