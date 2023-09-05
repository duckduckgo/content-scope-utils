import { CurrentResource, EditorKind } from './remote-resources.machine'
import { GetTabsResponse, RemoteResource } from '../../../schema/__generated__/schema.types'
import { ActorRefFrom } from 'xstate'
import { appMachine } from '../app/app.machine'
import { TabWithHostname } from '../types'
import { RemoteResourceMethods } from '../transforms.types'

export type RemoteResourcesEvents =
  | { type: 'set editor kind'; payload: EditorKind }
  | { type: 'set current domain'; payload: string }
  | { type: 'clear current domain' }
  | { type: 'error' }
  | { type: 'nav_resource' }
  | { type: 'nav_other' }
  | { type: 'tabs_received'; payload: GetTabsResponse }
  | { type: 'clearErrors' }
  | { type: 'hide url editor' }
  | { type: 'show url editor' }
  | { type: 'REGISTER_CHILD' }
  | { type: 'REMOVE_CHILD' }
  | RemoteResourceMethods

  // content
  | { type: 'content was reverted' }
  | { type: 'content was edited' }
  | { type: 'content is invalid'; errors: ContentError[] }
  | { type: 'content is valid' }

export interface ContentError {
  message: string
}

export interface RemoteResourcesCtx {
  messages: import('../DebugToolsMessages.mjs').DebugToolsMessages
  parent: ActorRefFrom<typeof appMachine>
  error?: string | null
  editorKind?: EditorKind
  currentDomain?: string
  resourceKey?: number
  resources?: RemoteResource[]
  currentResource?: CurrentResource
  contentErrors?: ContentError[]
  tabs: TabWithHostname[]
  // children?: ActorRef<any>[]
  children?: string[]
}

export type RemoteResourcesBroadcastEvents =
  | { type: 'broadcastCurrentDomain'; payload: { domain: string | undefined } }
  | { type: 'broadcastResourceSelected'; payload: { currentResource: CurrentResource } }
  | { type: 'broadcastPostResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }
  | { type: 'broadcastPreResourceUpdated'; payload: { currentResource: CurrentResource; resource: RemoteResource } }
