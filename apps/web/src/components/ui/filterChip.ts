/**
 * Shared class names for the filter chips used by the tournaments, tours
 * and directory boards, so every board gets the same size, hover, pressed
 * and focus treatment instead of re-declaring it per file.
 */
export const filterChipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold motion-reduce:transition-none active:translate-y-px ${
    active
      ? 'btn-brand'
      : 'btn-secondary bg-card text-stext hover:text-mtext'
  }`;

/** Count badge inside a chip: inherits the brand foreground when active. */
export const filterChipCountClass = (active: boolean) =>
  `tabular-nums ${active ? '' : 'text-stext'}`;
