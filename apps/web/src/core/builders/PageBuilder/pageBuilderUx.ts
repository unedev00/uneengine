import type { PageBuilderPaletteCategory } from './pageBuilderPalette';

/** Human-facing words are presentation only: registry IDs and persisted metadata never change. */
export const pageBuilderCategoryLabels: Record<PageBuilderPaletteCategory, string> = {
  'All Components': 'All blocks',
  Favourites: 'Favourites',
  Recent: 'Recently used',
  Layout: 'Sections',
  Display: 'Text & media',
  Inputs: 'Forms & inputs',
  Data: 'Lists & data',
  Navigation: 'Buttons & links'
};

export const pageBuilderStartOptions = [
  { type: 'Home Page', title: 'Home page', description: 'A starting place for your team.' },
  { type: 'Record Page', title: 'Record page', description: 'Display and edit a saved record.' },
  { type: 'App Page', title: 'App page', description: 'Create a page inside an application.' }
] as const;

/** Recently used entries are local editor preferences, not published tenant page metadata. */
export function addRecentPageBlock(previous: readonly string[], componentType: string, limit = 8): string[] {
  return [componentType, ...previous.filter(id => id !== componentType)].slice(0, limit);
}

export function loadRecentPageBlocks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string =>
      typeof id === 'string' && id.length > 0 && id.length <= 250))].slice(0, 8) : [];
  } catch {
    return [];
  }
}
