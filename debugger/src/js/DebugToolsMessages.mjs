/**
 * @module Debug Tools Messaging
 *
 * @description
 *
 * This describes the messages that need to be implemented. In order, you should implement the following:
 *
 *   - {@link DebugToolsMessages.getFeatures} - this occurs immediately to determine which feature set the platform supports
 *   - {@link DebugToolsMessages.getRemoteResource} - read an individual resource
 *   - {@link DebugToolsMessages.updateResource} - used to update/override a resource
 *   - {@link DebugToolsMessages.getTabs} - a way for the application to query for open tabs
 *   - {@link DebugToolsMessages.onTabsUpdated} - a subscription to allow
 *
 * **To ensure you can communicate with the application, refer to our [Standardized Messaging Format](https://duckduckgo.github.io/content-scope-scripts/modules/Messaging_Implementation_Guide.html)**
 *
 */

import {
  getFeaturesResponseSchema,
  getRemoteResourceParamsSchema,
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
 * @typedef {import("../../schema/__generated__/schema.types").GetRemoteResourceParams} GetRemoteResourceParams
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
   * ```json
   * [[include:debugger/schema/__fixtures__/__getFeatures__.json]]```
   *
   * @return {Promise<GetFeaturesResponse>}
   */
  async getFeatures() {
    const response = await this.messaging.request('getFeatures')
    const parsed = getFeaturesResponseSchema.parse(response)
    return {
      features: {
        ...parsed.features,
        // add additional features here if the native side isn't ready
      }
    }
  }

  /**
   * Retrieve a single Remote Resource.
   *
   * In this example `current` represents what the platform has currently applied.
   * See {@link RemoteResource} for the other variants (for example, a debug-tools override)
   *
   * ```json
   * [[include:debugger/schema/__fixtures__/__remoteResource__.json]]```
   *
   * @param {GetRemoteResourceParams} params
   * @return {Promise<RemoteResource>}
   */
  async getRemoteResource(params) {
    const outgoing = getRemoteResourceParamsSchema.parse(params)
    const response = await this.messaging.request('getRemoteResource', outgoing)
    const remoteResourceResponse = remoteResourceSchema.safeParse(response)
    if (remoteResourceResponse.success) {
      const formatted = formatResource(remoteResourceResponse.data)
      return formatted
    }
    console.log(remoteResourceResponse.error)
    throw new Error('todo: error handling')
  }

  /**
   * Updating a resource is used in all cases where we want to make a change, for example
   *
   * - refreshing the currently applied file
   * - overriding the current resource with a new URL
   * - overriding the current resource with a string from the debug panel
   *
   * For native implementors, you should assume any message received here is an indication to
   * reload any rules/resources related to it. It's a fresh start for the resource in question.
   *
   * ### Example: updating to a new remote resource
   *
   * This occurs when we want to fetch a resource fresh and apply it.
   * **Note** this URL might match what's already applied - and that's fine, you should ALWAYS re-fetch it.
   *
   * **params:**
   * ```json
   * [[include:debugger/schema/__fixtures__/__updateResourceRemote__.json]]```
   *
   * **returns: {@link RemoteResource}**
   *
   * <br>
   *
   * ### Example: applying local edits
   *
   * This occurs when a resource was edited in the panel.
   *
   * **Note** You should accept the string verbatim, just as you would from a remote. And then re-apply any relevant rules
   *
   * ```json
   * [[include:debugger/schema/__fixtures__/__updateResourceDebugTools__.json]]```
   *
   *
   * **returns: {@link RemoteResource}**
   *
   *
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
   * ```json
   * [[include:debugger/schema/__fixtures__/__getTabs__.json]]```
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

/**
 * @internal
 */
export const GlobalContext = createContext({
  /** @type {DebugToolsMessages | null} */
  messages: null,
  /** @type {import("history").History | null} */
  history: null,
})
