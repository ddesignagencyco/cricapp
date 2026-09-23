import { Suspense } from 'react';
import ToolsHub from '../../components/tools/ToolsHub';

export const metadata = {
  title: 'Cricket tools',
  description: 'Cricket calculators: run rates, DLS, averages, comparisons and fantasy points.',
};

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Suspense fallback={<div className="py-12 text-center text-sm text-stext">Loading tools…</div>}>
        <ToolsHub />
      </Suspense>
    </div>
  );
}
