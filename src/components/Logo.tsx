export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="时衡">
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.8" />
        <path d="M24 10v14l10 6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M9 40h30" stroke="var(--accent-2)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div>
          <strong>时衡</strong>
          <span>柳比歇夫时间管理</span>
        </div>
      )}
    </div>
  );
}
