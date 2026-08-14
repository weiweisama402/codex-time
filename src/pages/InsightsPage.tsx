import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { CATEGORIES } from '../constants';
import { formatDateLabel, periodBounds, shiftDateKey, todayKey } from '../lib/date';
import { formatDuration } from '../lib/duration';
import { dailySeries, entriesInRange, projectTotals, totals } from '../lib/stats';
import { useAppStore } from '../store/appStore';
import type { CategoryKey, PeriodType } from '../types';

type InsightMode = PeriodType | 'custom';

export function InsightsPage() {
  const entries = useAppStore((state) => state.entries);
  const projects = useAppStore((state) => state.projects);
  const settings = useAppStore((state) => state.settings)!;
  const [mode, setMode] = useState<InsightMode>('month');
  const [anchor, setAnchor] = useState(todayKey(settings.timezone));
  const [customStart, setCustomStart] = useState(shiftDateKey(anchor, -29));
  const [customEnd, setCustomEnd] = useState(anchor);
  const [category, setCategory] = useState<CategoryKey | 'all'>('all');
  const [projectId, setProjectId] = useState('all');
  const bounds: [string, string] = mode === 'custom' ? [customStart, customEnd] : periodBounds(mode, anchor);
  const [start, end] = bounds;
  const visible = useMemo(
    () =>
      entriesInRange(entries, start, end).filter(
        (entry) =>
          (category === 'all' || entry.categoryKey === category) &&
          (projectId === 'all' || entry.projectId === projectId)
      ),
    [entries, start, end, category, projectId]
  );
  const result = totals(visible);
  const series = dailySeries(visible, start, end);
  const pieData = CATEGORIES.map((item) => ({
    name: item.label,
    value: result.byCategory[item.key],
    color: item.color
  })).filter((item) => item.value > 0);
  const ranking = [...projectTotals(visible)]
    .map(([id, value]) => ({
      id,
      name: projects.find((project) => project.id === id)?.name ?? '已归档项目',
      value
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const effectiveRate = result.total ? Math.round((result.effective / result.total) * 100) : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Evidence-based review</p>
          <h1>时间洞察</h1>
          <p>从投入结构理解效率，而不是用忙碌感评价一天。</p>
        </div>
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={17} />
          打印 / PDF
        </button>
      </header>
      <section className="toolbar-card insights-toolbar">
        <div className="segmented">
          {(['day', 'week', 'month', 'year'] as PeriodType[]).map((item) => (
            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
              {{ day: '日', week: '周', month: '月', year: '年' }[item]}
            </button>
          ))}
          <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>
            自定义
          </button>
        </div>
        {mode === 'custom' ? (
          <div className="custom-range">
            <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            <span>至</span>
            <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
        ) : (
          <input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} />
        )}
        <div className="filter-row">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryKey | 'all')}
          >
            <option value="all">全部分类</option>
            {CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">全部项目</option>
            {projects
              .filter((project) => !project.deletedAt)
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
        </div>
      </section>
      <div className="insight-kpis">
        <article>
          <span>累计记录</span>
          <strong>{formatDuration(result.total, true)}</strong>
          <small>
            {start} — {end}
          </small>
        </article>
        <article>
          <span>有效时间</span>
          <strong>{formatDuration(result.effective, true)}</strong>
          <small>主要 + 附加工作</small>
        </article>
        <article>
          <span>有效占比</span>
          <strong>{effectiveRate}%</strong>
          <small>占全部记录时间</small>
        </article>
        <article>
          <span>活跃日均</span>
          <strong>{formatDuration(result.activeDays ? result.total / result.activeDays : 0, true)}</strong>
          <small>{result.activeDays} 个记录日</small>
        </article>
      </div>
      <div className="dashboard-grid">
        <section className="chart-card wide">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Trend</p>
              <h2>每日时间结构</h2>
            </div>
            <span>{mode === 'day' ? formatDateLabel(anchor) : `${series.length} 天`}</span>
          </div>
          {series.some((item) => item.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={series} margin={{ top: 12, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} minTickGap={20} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 3600)}h`} />
                <Tooltip
                  formatter={(value) => formatDuration(Number(value), true)}
                  labelFormatter={(label) => formatDateLabel(String(label))}
                />
                {CATEGORIES.map((item) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    stackId="time"
                    fill={item.color}
                    name={item.label}
                    radius={item.key === 'fun' ? [4, 4, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </section>
        <section className="chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Distribution</p>
              <h2>分类占比</h2>
            </div>
          </div>
          {pieData.length ? (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatDuration(Number(value), true)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend-list">
                {pieData.map((item) => (
                  <div key={item.name}>
                    <span style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <strong>{result.total ? Math.round((item.value / result.total) * 100) : 0}%</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty />
          )}
        </section>
        <section className="chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>项目投入排行</h2>
            </div>
          </div>
          {ranking.length ? (
            <div className="ranking-list">
              {ranking.map((item, index) => (
                <div key={item.id}>
                  <span className="rank">{index + 1}</span>
                  <span className="ranking-name">{item.name}</span>
                  <div className="ranking-bar">
                    <i style={{ width: `${Math.max(4, (item.value / ranking[0]!.value) * 100)}%` }} />
                  </div>
                  <strong>{formatDuration(item.value, true)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <ChartEmpty />
          )}
        </section>
      </div>
      <section className="heatmap-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Consistency</p>
            <h2>记录热力</h2>
          </div>
        </div>
        <div className="heatmap-grid">
          {series.map((item) => (
            <div
              key={item.date}
              className="heat-cell"
              title={`${item.date} · ${formatDuration(item.total, true)}`}
              style={
                {
                  '--heat': result.total
                    ? Math.min(1, item.total / Math.max(...series.map((day) => day.total), 1))
                    : 0
                } as React.CSSProperties
              }
            >
              <span>{item.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ChartEmpty() {
  return (
    <div className="chart-empty">
      <p>该范围内暂无数据</p>
      <span>开始记录后，这里会生成可下钻的统计。</span>
    </div>
  );
}
