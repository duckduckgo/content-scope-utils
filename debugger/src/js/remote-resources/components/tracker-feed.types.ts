import { DebugToolsMessages } from '../../DebugToolsMessages.mjs'
import { DetectedRequest, GetTrackersResponse } from '../../../../schema/__generated__/schema.types'

export interface TrackerFeedContext {
  domain: string | null | undefined
  messages: DebugToolsMessages
  requests: DetectedRequest[]
}

export type TrackerFeedEvents =
  | { type: 'onTrackersUpdated'; payload: GetTrackersResponse }
  | { type: 'subscribeToDomain' }
  | { type: 'broadcastCurrentDomain'; payload: { domain: string | undefined } }
  | { type: 'refresh' }
