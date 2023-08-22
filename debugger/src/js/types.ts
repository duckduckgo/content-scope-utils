import {
  RemoteResource,
  Tab,
  UpdateResourceParams,
  GetFeaturesResponse,
  GetTabsResponse,
} from '../../schema/__generated__/schema.types'
import { ActorRef, ActorRefFrom } from 'xstate'
import { appMachine } from './app/app.machine-impl'
import { CurrentResource, EditorKind, ToggleKind } from './remote-resources/remote-resources.machine'

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

export type RemoteResourcesEvents =
  | { type: 'set editor kind'; payload: EditorKind }
  | { type: 'set toggle kind'; payload: ToggleKind }
  | { type: 'set current domain'; payload: string }
  | { type: 'clear current domain' }
  | { type: 'error' }
  | { type: 'nav_resource' }
  | { type: 'nav_other' }
  | { type: 'tabs_received'; payload: GetTabsResponse }
  | { type: 'clearErrors' }
  | { type: 'hide url editor' }
  | { type: 'show url editor' }

  // content
  | { type: 'content was reverted' }
  | { type: 'content was edited' }
  | { type: 'content is invalid'; markers: import('monaco-editor').editor.IMarker[] }
  | { type: 'content is valid' }
  | { type: 'save new remote'; payload: UpdateResourceParams }
  | { type: 'save edited'; payload: UpdateResourceParams }

export type RemoteResourcesBroadcastEvents =
  | { type: 'broadcastResourceSelected'; payload: { currentResource: CurrentResource } }
  | { type: 'broadcastPostResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }
  | { type: 'broadcastPreResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }

export type DomainExceptionEvents =
  | { type: 'DOMAINS'; domains: string[]; current: string }
  | { type: 'SELECT_TAB_DOMAIN'; domain: string }
  | { type: 'ADD_NEW' }
  | { type: 'SAVE_NEW'; domain: string }
  | { type: 'CANCEL' }
  | { type: 'CLEAR' }
  | { type: '🌐 url updated' }
  | { type: 'EDIT' }

export type PatchesEvents = { type: 'PATCH_AVAILABLE' } | { type: 'PATCH_REMOVED' } | { type: 'COPY_TO_CLIPBOARD' }

export type TabWithHostname = Tab & { hostname: string }

export interface RemoteResourcesCtx {
  messages: import('./DebugToolsMessages.mjs').DebugToolsMessages
  parent: ActorRefFrom<typeof appMachine>
  error?: string | null
  editorKind?: EditorKind
  toggleKind?: ToggleKind
  currentDomain?: string
  resourceKey?: number
  resources?: RemoteResource[]
  currentResource?: CurrentResource
  contentMarkers?: import('monaco-editor').editor.IMarker[]
  tabs: TabWithHostname[]
  children?: ActorRef<any>[]
}

export interface RouteDefinition {
  loader: (...args: unknown[]) => unknown
  title: string
  feature: string
}

export interface AppMachineCtx {
  history: import('history').History
  messages: import('./DebugToolsMessages.mjs').DebugToolsMessages
  routes: Record<string, RouteDefinition>
  error: string | null
  features: GetFeaturesResponse['features'] | null
  params: Record<string, unknown> | null
  search: URLSearchParams | null
  match: string | null
  page: RouteDefinition['loader'] | null
}
