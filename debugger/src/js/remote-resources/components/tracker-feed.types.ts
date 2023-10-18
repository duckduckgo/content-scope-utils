import { DebugToolsMessages } from '../../DebugToolsMessages.mjs'
import { DetectedRequest, GetTrackersResponse } from '../../../../schema/__generated__/schema.types'

export interface TrackerFeedContext {
  domain: string | null | undefined
  messages: DebugToolsMessages
  requests: DetectedRequest[]
  manualEntries: Array<{ requestUrl: string }>
}

// prettier-ignore
export type UrlRequestEntry =
  | { requestUrl: string }

export type TrackerFeedEvents =
  | { type: 'onTrackersUpdated'; payload: GetTrackersResponse }
  | { type: 'add domain entries'; payload: Array<{ requestUrl: string; domain: string }> }
  | { type: 'add match-all entries'; payload: Array<UrlRequestEntry> }
  | { type: 'delete manual entries'; payload: Array<UrlRequestEntry> }
  | { type: 'domain changed'; payload: { domain: string | undefined } }
  | { type: 'refresh' }
  | { type: 'reset manual entries' }
