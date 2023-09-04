import { DebugToolsMessages, type OnTrackersUpdatedSchema } from '../../DebugToolsMessages.mjs'

export interface TrackerFeedContext {
  domain: string | null | undefined
  messages: DebugToolsMessages
  requests: OnTrackersUpdatedSchema['requests']
}

export type TrackerFeedEvents =
  | { type: 'onTrackersUpdated'; payload: OnTrackersUpdatedSchema }
  | { type: 'subscribeToDomain' }
