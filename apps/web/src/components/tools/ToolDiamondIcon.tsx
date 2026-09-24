import type { ToolKind } from '../../lib/toolsCatalog';
import { ToolGlyph } from './toolIcons';

export default function ToolDiamondIcon({ kind, size = 20 }: { kind: ToolKind; size?: number }) {
  return (
    <div className="tool-diamond-icon shrink-0" aria-hidden>
      <span className="tool-diamond-icon__shape" />
      <span className="tool-diamond-icon__glyph text-accent">
        <ToolGlyph kind={kind} size={size} />
      </span>
    </div>
  );
}
