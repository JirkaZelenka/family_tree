import type { ForceNodeLayout, ForceSavedViews, ViewLayout } from '@/types/vault'

export const DEFAULT_FORCE_VIEW_PRESET = 'Uložený pohled'

export function mergeForcePositions(
  autoLayout: Record<string, ForceNodeLayout>,
  sessionNodes: Record<string, ForceNodeLayout>,
): Record<string, ForceNodeLayout> {
  return { ...autoLayout, ...sessionNodes }
}

export function migrateForceSavedViews(forceView: ViewLayout): ForceSavedViews {
  const views = { ...(forceView.forceSavedViews ?? {}) }
  if (Object.keys(views).length > 0) return views

  const legacy = forceView.forceSavedView ?? {}
  if (Object.keys(legacy).length > 0) {
    return { [DEFAULT_FORCE_VIEW_PRESET]: { ...legacy } }
  }

  const nodes = forceView.forceNodes ?? {}
  if (Object.keys(nodes).length > 0) {
    return { [DEFAULT_FORCE_VIEW_PRESET]: { ...nodes } }
  }

  return {}
}

export function activeForceViewNodes(
  views: ForceSavedViews,
  activeName: string | null,
): Record<string, ForceNodeLayout> {
  if (!activeName) return {}
  return { ...(views[activeName] ?? {}) }
}
