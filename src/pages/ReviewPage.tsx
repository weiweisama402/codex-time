import { CheckCircle2, Plus, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_MAP } from '../constants';
import { periodBounds, periodStart, todayKey } from '../lib/date';
import { formatDuration, minutesToSeconds } from '../lib/duration';
import { entriesInRange, totals } from '../lib/stats';
import { useAppStore } from '../store/appStore';
import type { PeriodType, Plan } from '../types';

export function ReviewPage() {
  const entries = useAppStore((state) => state.entries);
  const allProjects = useAppStore((state) => state.projects);
  const allPlans = useAppStore((state) => state.plans);
  const allReviews = useAppStore((state) => state.reviews);
  const settings = useAppStore((state) => state.settings)!;
  const savePlan = useAppStore((state) => state.savePlan);
  const saveReview = useAppStore((state) => state.saveReview);
  const today = todayKey(settings.timezone);
  const projects = useMemo(() => allProjects.filter((project) => !project.deletedAt), [allProjects]);
  const plans = useMemo(() => allPlans.filter((plan) => !plan.deletedAt), [allPlans]);
  const reviews = useMemo(() => allReviews.filter((review) => !review.deletedAt), [allReviews]);
  const [planType, setPlanType] = useState<Plan['periodType']>('month');
  const [planAnchor, setPlanAnchor] = useState(today);
  const [scope, setScope] = useState('category:main');
  const [targetHours, setTargetHours] = useState('40');
  const [planNote, setPlanNote] = useState('');
  const [reviewType, setReviewType] = useState<PeriodType>('day');
  const [reviewAnchor, setReviewAnchor] = useState(today);
  const reviewKey = periodStart(reviewType, reviewAnchor);
  const existingReview = reviews.find(
    (review) => review.periodType === reviewType && review.periodStart === reviewKey
  );
  const [wins, setWins] = useState<string | null>(null);
  const [issues, setIssues] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const activePlans = useMemo(
    () =>
      plans.filter(
        (plan) => plan.periodType === planType && plan.periodStart === periodStart(planType, planAnchor)
      ),
    [plans, planType, planAnchor]
  );
  const [reviewStart, reviewEnd] = periodBounds(reviewType, reviewAnchor);
  const reviewTotals = totals(entriesInRange(entries, reviewStart, reviewEnd));

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    const [scopeType, scopeId] = scope.split(':') as ['category' | 'project', string];
    await savePlan({
      periodType: planType,
      periodStart: periodStart(planType, planAnchor),
      scopeType,
      scopeId,
      targetSeconds: minutesToSeconds(Number(targetHours) * 60),
      note: planNote
    });
    setMessage('计划已保存');
  };
  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveReview({
      periodType: reviewType,
      periodStart: reviewKey,
      wins: wins ?? existingReview?.wins ?? '',
      issues: issues ?? existingReview?.issues ?? '',
      adjustments: adjustments ?? existingReview?.adjustments ?? ''
    });
    setMessage('复盘已保存');
  };
  const actualFor = (plan: Plan) => {
    const [start, end] = periodBounds(plan.periodType, plan.periodStart);
    const selected = entriesInRange(entries, start, end).filter((entry) =>
      plan.scopeType === 'category' ? entry.categoryKey === plan.scopeId : entry.projectId === plan.scopeId
    );
    return totals(selected).total;
  };
  const scopeName = (plan: Plan) =>
    plan.scopeType === 'category'
      ? CATEGORY_MAP[plan.scopeId as keyof typeof CATEGORY_MAP].label
      : (projects.find((project) => project.id === plan.scopeId)?.name ?? '已归档项目');

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Plan · Account · Reflect</p>
          <h1>计划与复盘</h1>
          <p>用历史投入估算未来，再用偏差修正方法。</p>
        </div>
      </header>
      {message && (
        <div className="inline-success" role="status">
          <CheckCircle2 size={18} />
          {message}
          <button onClick={() => setMessage('')}>关闭</button>
        </div>
      )}
      <div className="review-grid">
        <section className="form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Target</p>
              <h2>周期投入计划</h2>
            </div>
            <Target />
          </div>
          <form className="form-stack" onSubmit={(event) => void createPlan(event)}>
            <div className="form-row">
              <label className="field">
                <span>周期</span>
                <select
                  value={planType}
                  onChange={(event) => setPlanType(event.target.value as Plan['periodType'])}
                >
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </select>
              </label>
              <label className="field">
                <span>日期锚点</span>
                <input
                  type="date"
                  value={planAnchor}
                  onChange={(event) => setPlanAnchor(event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>计划对象</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                <optgroup label="四大分类">
                  {CATEGORIES.map((category) => (
                    <option key={category.key} value={`category:${category.key}`}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="项目">
                  {projects.map((project) => (
                    <option key={project.id} value={`project:${project.id}`}>
                      {project.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="field">
              <span>目标投入（小时）</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={targetHours}
                onChange={(event) => setTargetHours(event.target.value)}
              />
            </label>
            <label className="field">
              <span>计划说明</span>
              <textarea
                rows={2}
                value={planNote}
                onChange={(event) => setPlanNote(event.target.value)}
                placeholder="本周期希望推进到什么程度？"
              />
            </label>
            <button className="button primary">
              <Plus size={18} />
              保存计划
            </button>
          </form>
        </section>
        <section className="form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Reflection</p>
              <h2>结构化复盘</h2>
            </div>
            <span>{formatDuration(reviewTotals.effective, true)} 有效</span>
          </div>
          <form className="form-stack" onSubmit={(event) => void submitReview(event)}>
            <div className="form-row">
              <label className="field">
                <span>复盘尺度</span>
                <select
                  value={reviewType}
                  onChange={(event) => {
                    setReviewType(event.target.value as PeriodType);
                    setWins(null);
                    setIssues(null);
                    setAdjustments(null);
                  }}
                >
                  <option value="day">日</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </select>
              </label>
              <label className="field">
                <span>日期锚点</span>
                <input
                  type="date"
                  value={reviewAnchor}
                  onChange={(event) => {
                    setReviewAnchor(event.target.value);
                    setWins(null);
                    setIssues(null);
                    setAdjustments(null);
                  }}
                />
              </label>
            </div>
            <label className="field">
              <span>完成了什么</span>
              <textarea
                rows={3}
                value={wins ?? existingReview?.wins ?? ''}
                onChange={(event) => setWins(event.target.value)}
                placeholder="可验证的成果，而不是感受"
              />
            </label>
            <label className="field">
              <span>偏差与原因</span>
              <textarea
                rows={3}
                value={issues ?? existingReview?.issues ?? ''}
                onChange={(event) => setIssues(event.target.value)}
                placeholder="哪些计划没有完成，为什么？"
              />
            </label>
            <label className="field">
              <span>下一周期调整</span>
              <textarea
                rows={3}
                value={adjustments ?? existingReview?.adjustments ?? ''}
                onChange={(event) => setAdjustments(event.target.value)}
                placeholder="保留什么、停止什么、改变什么？"
              />
            </label>
            <button className="button primary">保存复盘</button>
          </form>
        </section>
      </div>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plan vs actual</p>
            <h2>当前计划进度</h2>
          </div>
          <span>{activePlans.length} 项</span>
        </div>
        {activePlans.length ? (
          <div className="plan-list">
            {activePlans.map((plan) => {
              const actual = actualFor(plan);
              const progress = Math.min(100, Math.round((actual / plan.targetSeconds) * 100));
              return (
                <article key={plan.id}>
                  <div>
                    <strong>{scopeName(plan)}</strong>
                    <span>
                      {formatDuration(actual, true)} / {formatDuration(plan.targetSeconds, true)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                  <footer>
                    <span>{plan.note || '无补充说明'}</span>
                    <strong>{progress}%</strong>
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>该周期还没有计划</h3>
            <p>为分类或项目设定投入目标，之后即可比较计划与实际。</p>
          </div>
        )}
      </section>
    </>
  );
}
