/**
 * @module Debug Tools Messaging
 *
 * @description
 *
 * This class describes the messages that native platforms are expected to
 * receive and respond to
 */

import {
  getFeaturesResponseSchema,
  getTabsResponseSchema,
  remoteResourceSchema,
  updateResourceParamsSchema,
} from '../../schema/__generated__/schema.parsers.mjs'
import { createContext } from 'react'

/**
 * @typedef {import("../../schema/__generated__/schema.types").RemoteResource} RemoteResource
 * @typedef {import("../../schema/__generated__/schema.types").GetTabsResponse} GetTabsResponse
 * @typedef {import("../../schema/__generated__/schema.types").GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import("../../schema/__generated__/schema.types").UpdateResourceParams} UpdateResourceParams
 */

/**
 * Messaging
 */
export class DebugToolsMessages {
  /**
   * @param {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").Messaging} messaging
   * @internal
   */
  constructor(messaging) {
    /**
     * @internal
     */
    this.messaging = messaging
  }

  /**
   * The initial handshake - this is the first thing called to determine
   * the feature set supported by the native platform in question
   *
   * @return {Promise<GetFeaturesResponse>}
   */
  async getFeatures() {
    const response = await this.messaging.request('getFeatures')
    const parsed = getFeaturesResponseSchema.parse(response)
    const resources = parsed.features.remoteResources.resources
    parsed.features.remoteResources.resources = resources.map(formatResource)
    return parsed
  }

  /**
   * @param {UpdateResourceParams} params
   * @return {Promise<RemoteResource>}
   */
  async updateResource(params) {
    const outgoing = updateResourceParamsSchema.parse(params)
    const response = await this.messaging.request('updateResource', outgoing)
    const featuresResponse = remoteResourceSchema.safeParse(response)
    if (featuresResponse.success) {
      const formatted = formatResource(featuresResponse.data)
      return formatted
    }
    console.log(featuresResponse.error)
    throw new Error('todo: error handling')
  }

  /**
   * Get the currently open tabs. This is used to target certain
   * modifications to a particular domain if possible.
   *
   * For example, applying a domain exception for a particular feature
   *
   * @return {Promise<GetTabsResponse>}
   */
  async getTabs() {
    const response = await this.messaging.request('getTabs', {})
    const featuresResponse = getTabsResponseSchema.safeParse(response)
    if (featuresResponse.success) {
      return featuresResponse.data
    }
    console.log(featuresResponse.error)
    throw new Error('todo: error handling')
  }

  /**
   * A subscription for receiving new lists of tabs - it's the push version of {@link DebugToolsMessages.getTabs}
   * @param {(data: GetTabsResponse) => void} callback
   */
  onTabsUpdated(callback) {
    return this.messaging.subscribe('onTabsUpdated', (params) => {
      const featuresResponse = getTabsResponseSchema.safeParse(params)
      if (featuresResponse.success) {
        callback(featuresResponse.data)
      } else {
        console.error(featuresResponse.error)
      }
    })
  }
}

/**
 * @param {RemoteResource} input
 * @return {RemoteResource}
 */
function formatResource(input) {
  return {
    ...input,
    current: {
      ...input.current,
      contents: JSON.stringify(JSON.parse(input.current.contents), null, 4),
    },
  }
}

export const GlobalContext = createContext({
  /** @type {DebugToolsMessages | null} */
  messages: null,
  /** @type {import("history").History | null} */
  history: null,
})
