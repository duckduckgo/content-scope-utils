import {
  mockResponses,
  mockWebkitMessaging,
  mockWindowsMessaging,
  readOutgoingMessages,
  simulateSubscriptionMessage,
  waitForCallCount,
} from '@duckduckgo/content-scope-scripts/packages/messaging/lib/test-utils.mjs'
import { Resources } from './resources'

export class Mocks {
  /**
   * @type {Record<string, any>}
   * @private
   */
  _defaultResponses = {}

  /**
   * @param {import("@playwright/test").Page} page
   * @param {Resources} resources
   * @param {import("@duckduckgo/content-scope-scripts/integration-test/playwright/type-helpers.mjs").Build | null} build
   * @param {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingContext} messagingContext
   */
  constructor(page, resources, build, messagingContext) {
    this.page = page
    this.resources = resources
    /** @type {import("@duckduckgo/content-scope-scripts/integration-test/playwright/type-helpers.mjs").Build | null} */
    this.build = build
    this.messagingContext = messagingContext
  }

  /**
   * @param {Record<string, any>} responses
   * @return {Promise<void>}
   */
  async withResponses(responses) {
    await this.page.evaluate(mockResponses, {
      responses: responses,
    })
  }

  /**
   * @returns {Promise<void|*|string>}
   */
  async install() {
    await this.installMessagingMocks()
  }

  async installMessagingMocks() {
    if (!this.build) {
      return await this.page.addInitScript(() => {
        window.__playwright_01 = {
          mockResponses: { models: {} },
          errorResponses: {},
          subscriptionEvents: [],
          mocks: {
            outgoing: [],
          },
          models: {},
        }
      })
    }
    await this.build.switch({
      windows: async () => {
        await this.page.addInitScript(mockWindowsMessaging, {
          messagingContext: this.messagingContext,
          responses: this._defaultResponses,
          errors: {},
        })
      },
      apple: async () => {
        await this.page.addInitScript(mockWebkitMessaging, {
          messagingContext: this.messagingContext,
          responses: this._defaultResponses,
          errors: {},
        })
      },
    })
  }

  /**
   * @param {Record<string, any>} responses
   */
  defaultResponses(responses) {
    this._defaultResponses = {
      ...this._defaultResponses,
      ...responses,
    }
  }

  /**
   * @param {{names: string[]}} [opts]
   * @returns {Promise<any[]>}
   */
  async outgoing(opts = { names: [] }) {
    const result = await this.page.evaluate(readOutgoingMessages)
    if (Array.isArray(opts.names) && opts.names.length > 0) {
      return result.filter(({ payload }) => opts.names.includes(payload.method))
    }
    return result
  }

  /**
   * @param {object} params
   * @param {string} params.method
   * @param {number} params.count
   * @return {Promise<*>}
   */
  async waitForCallCount(params) {
    await this.page.waitForFunction(waitForCallCount, params, { timeout: 3000, polling: 100 })
    return this.outgoing({ names: [params.method] })
  }

  withDefaultResponses() {
    // default mocks - just enough to render the first page without error
    /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
    const resource = this.resources.remoteResources.privacyConfig()
    /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
    const updatedResource = Resources.updatedResource(resource, resource.current.contents)

    /** @type {import('../../schema/__generated__/schema.types').GetFeaturesResponse} */
    const getFeatures = {
      features: {
        remoteResources: {
          resources: [resource],
        },
      },
    }

    /** @type {import('../../schema/__generated__/schema.types').GetTabsResponse} */
    const getTabs = {
      tabs: [],
    }

    this.defaultResponses({
      getFeatures,
      getTabs,
      getRemoteResource: resource,
      updateResource: updatedResource,
    })
  }
}
