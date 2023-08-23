import { Tab } from '../../schema/__generated__/schema.types'

export type PatchesEvents = { type: 'PATCH_AVAILABLE' } | { type: 'PATCH_REMOVED' } | { type: 'COPY_TO_CLIPBOARD' }

export type TabWithHostname = Tab & { hostname: string }

export interface RouteDefinition {
  loader: (...args: unknown[]) => unknown
  title: string
  feature: string
}
