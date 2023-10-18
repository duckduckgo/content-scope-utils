import { CurrentResource, EditorKind } from './remote-resources.machine'
import { GetTabsResponse, RemoteResource } from '../../../schema/__generated__/schema.types'
import { ActorRefFrom } from 'xstate'
import { appMachine } from '../app/app.machine'
import { TabWithHostname } from '../types'
import { RemoteResourceMethods } from '../transforms.types'
import { ToggleFeatureDomain } from '../transforms/toggle-feature-domain'
import { ToggleFeature } from '../transforms/toggle-feature'
import { UpdateVersion } from '../transforms/update-version'
import { ToggleUnprotected } from '../transforms/toggle-unprotected'
import { ToggleAllowlistedTracker } from '../transforms/allow-list'

export type RemoteResourcesEvents =
  | { type: 'set editor kind'; payload: EditorKind }
  | { type: 'set current domain'; payload: string }
  | { type: 'set current resource content'; payload: string }
  | { type: 'revert current content' }
  | { type: 'show original diff' }
  | { type: 'close original diff' }
  | { type: 'clear current domain' }
  | { type: 'error' }
  | { type: 'nav_resource' }
  | { type: 'nav_other' }
  | { type: 'tabs_received'; payload: GetTabsResponse }
  | { type: 'clearErrors' }
  | { type: 'hide url editor' }
  | { type: 'show url editor' }
  | RemoteResourceMethods

  // content
  | { type: 'content was reverted' }
  | { type: 'content was edited' }
  | { type: 'content is invalid'; errors: ContentError[] }
  | { type: 'content is valid' }
  | { type: 'done.invoke.fetchOriginal'; data: RemoteResource }
  | TransformCommands
  | { type: 'transform-proxy'; original: TransformCommands; subject: { contents: string } }

export interface ContentError {
  message: string
}

export interface RemoteResourcesCtx {
  messages: import('../DebugToolsMessages.mjs').DebugToolsMessages
  parent: ActorRefFrom<typeof appMachine>
  error?: string | null
  editorKind?: EditorKind
  currentDomain?: string
  resources?: RemoteResource[]
  currentResource?: CurrentResource
  originalResources: Record<string, RemoteResource>
  contentErrors?: ContentError[]
  tabs: TabWithHostname[]
  // children?: ActorRef<any>[]
  children?: string[]
}

// prettier-ignore
export type TransformCommands =
  | Serialized<typeof UpdateVersion>
  | Serialized<typeof ToggleFeatureDomain>
  | Serialized<typeof ToggleFeature>
  | Serialized<typeof ToggleUnprotected>
  | Serialized<typeof ToggleAllowlistedTracker>

type Serialized<T, K extends string = string> = T extends abstract new (...args: any) => any
  ? InstanceType<T> extends Serializable<K>
    ? { type: InstanceType<T>['type']; payload: ConstructorParameters<T>[0] }
    : never
  : never

export interface Serializable<K extends string> {
  type: K
}
