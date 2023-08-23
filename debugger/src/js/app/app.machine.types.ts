import { GetFeaturesResponse, Tab } from '../../../schema/__generated__/schema.types'
import { RouteDefinition } from '../types'

export type AppEvents =
  | { type: 'routes resolved' }
  | { type: 'nav_internal'; match: string; params: Record<string, unknown> | null; search: string }
  | { type: 'nav-default'; feature: string }
  | { type: 'tabs loaded'; payload: Tab[] }
  | { type: '👆 retry' }
  | { type: 'Event 1' }
  | { type: '👆 save modifications' }
  | { type: '✏️ edits' }
  | { type: 'error' }
  | { type: 'clearErrors' }

export interface AppMachineCtx {
  history: import('history').History
  messages: import('../DebugToolsMessages.mjs').DebugToolsMessages
  routes: Record<string, RouteDefinition>
  error: string | null
  features: GetFeaturesResponse['features'] | null
  params: Record<string, unknown> | null
  search: URLSearchParams | null
  match: string | null
  page: RouteDefinition['loader'] | null
}
