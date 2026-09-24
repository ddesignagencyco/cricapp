import type { AssistantUnavailable } from '../../services/assistant';
import { isScopeUnavailable } from '../../lib/assistant';

export default function UnavailableBanner({
  items,
  answerText = '',
}: {
  items: AssistantUnavailable[];
  answerText?: string;
}) {
  const shown = items.filter((item) => {
    const reason = item.reason.trim().toLowerCase();
    if (!reason) return false;
    return !answerText.toLowerCase().includes(reason);
  });
  if (!shown.length) return null;
  return (
    <ul className="space-y-1.5">
      {shown.map((item) => {
        const scope = isScopeUnavailable(item.field);
        return (
          <li
            key={`${item.field}-${item.reason}`}
            className={`rounded-md px-2.5 py-2 text-xs font-medium leading-relaxed ${
              scope
                ? 'bg-warning-soft text-warning ring-1 ring-warning/25'
                : 'bg-info-soft text-info ring-1 ring-info/25'
            }`}
          >
            {scope ? 'Out of this database: ' : ''}
            {item.reason}
          </li>
        );
      })}
    </ul>
  );
}
