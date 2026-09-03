'use client';

const toneValue = { default: 'text-mtext', accent: 'text-accent', green: 'text-accent2', gold: 'text-gold', danger: 'text-danger' };

export default function StatCard({ label, value, sub, icon: Icon, tone = 'default', className = '' }) {
  return (
    <div className={`rounded-2xl border-t-2 bg-card p-5 ring-1 ring-lborder transition-transform duration-300 hover:-translate-y-0.5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stext">{label}</p>
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-elevated">
            <Icon size={16} className="text-accent" />
          </span>
        )}
      </div>
      <p className={`mt-2 font-mono text-3xl font-black tabular-nums ${toneValue[tone] || toneValue.default}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-stext">{sub}</p>}
    </div>
  );
}