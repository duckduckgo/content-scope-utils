import { CurrentResource, EditorKind, ToggleKind } from './remote-resources.machine'
import { GetTabsResponse, RemoteResource, UpdateResourceParams } from '../../../schema/__generated__/schema.types'
import { ActorRef, ActorRefFrom } from 'xstate'
import { appMachine } from '../app/app.machine'
import { TabWithHostname } from '../types'

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

export interface RemoteResourcesCtx {
  messages: import('../DebugToolsMessages.mjs').DebugToolsMessages
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

export type RemoteResourcesBroadcastEvents =
  | { type: 'broadcastResourceSelected'; payload: { currentResource: CurrentResource } }
  | { type: 'broadcastPostResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }
  | { type: 'broadcastPreResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }
