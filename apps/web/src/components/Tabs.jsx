'use client';

export default function Tabs({ tabs, active, onChange, className = '', size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div
      className={`inline-flex w-full max-w-full flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-lborder sm:w-auto ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 rounded-lg font-semibold transition-all duration-200 ${pad} ${
              isActive
                ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                : 'text-stext hover:bg-elevated hover:text-mtext'
            }`}
          >
            {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.2} />}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-accent text-primary' : 'bg-elevated text-stext'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}