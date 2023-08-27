import { GetFeaturesResponse, Tab } from '../../../schema/__generated__/schema.types'
import { Feature, FeatureModuleDescription, UseableFeature } from '../types'

export type AppEvents =
  | { type: 'routes resolved' }
  | { type: 'NAV_INTERNAL'; feature: Feature; search: URLSearchParams }
  | { type: 'nav-default'; feature: string }
  | { type: 'tabs loaded'; payload: Tab[] }
  | { type: '👆 retry' }
  | { type: 'Event 1' }
  | { type: '👆 save modifications' }
  | { type: '✏️ edits' }
  | { type: 'error' }
  | { type: 'clearErrors' }
  | {
      type: 'done.invoke.handleFirstLoad'
      data: { feature: Feature; search: URLSearchParams; preModules: UseableFeature[] }
    }

export interface AppMachineCtx {
  history: import('history').History
  messages: import('../DebugToolsMessages.mjs').DebugToolsMessages
  error: string | null
  features: GetFeaturesResponse['features'] | null
  search: URLSearchParams | null
  feature: Feature | null
  loader: (segment: string) => Promise<Feature>
  preLoader: (featureName: string) => Promise<FeatureModuleDescription>
  preModules: UseableFeature[]
  currentModule: UseableFeature | null
}
