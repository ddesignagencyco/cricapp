interface DirectoryPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  count: number | string;
  countLabel: string;
}

/** Matches MatchBoard / ScheduleBoard / ToolsHub page headers. */
export default function DirectoryPageHeader({
  eyebrow,
  title,
  description,
  count,
  countLabel,
}: DirectoryPageHeaderProps) {
  return (
    <header>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-mtext">{title}</h1>
          <p className="mt-1 text-sm text-stext">{description}</p>
        </div>
        <p className="text-xs text-stext">
          <span className="font-semibold tabular-nums text-mtext">{count}</span> {countLabel}
        </p>
      </div>
    </header>
  );
}
