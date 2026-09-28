'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ToolDef } from '../../lib/toolsCatalog';

const ToolDefContext = createContext<ToolDef | null>(null);

/** Lets result cards (and their share buttons) know which tool they belong to. */
export function ToolDefProvider({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  return <ToolDefContext.Provider value={tool}>{children}</ToolDefContext.Provider>;
}

export function useToolDef(): ToolDef | null {
  return useContext(ToolDefContext);
}
