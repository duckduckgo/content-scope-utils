import {
  getRemoteResourceParamsSchema,
  getTrackersResponseSchema,
  subscribeToTrackersParamsSchema,
  updateResourceParamsSchema,
} from '../../schema/__generated__/schema.parsers.mjs'

import getTrackersResponse from '../../schema/__fixtures__/__getTrackers__.json'

/**
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingTransport} MessagingTransport
 * @typedef {import("../../schema/__generated__/schema.types").GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../schema/__generated__/schema.types').GetTrackersResponse} GetTrackersResponse
 */

/** @type {import("../../schema/__generated__/schema.types").GetTabsResponse} */
const tabData = {
  tabs: [
    { url: 'https://example.com/123/abc' },
    { url: 'https://duckduckgo.com/?q=123' },
    { url: 'https://abc.duckduckgo.com/?q=123' },
  ],
}

// const tabData = { tabs: [] }
/** @type {Set<string>} */
const trackerSubscriptions = new Set([])

/**
 * @implements MessagingTransport
 */
export class MockImpl {
  notify(msg) {
    switch (msg.method) {
      case 'subscribeToTrackers': {
        const parsed = subscribeToTrackersParamsSchema.parse(msg.params)
        for (let domain of parsed.domains) {
          trackerSubscriptions.add(domain)
        }
        break
      }
      case 'unsubscribeToTrackers': {
        trackerSubscriptions.clear()
        break
      }
      default:
        throw new Error('unhandled notification: ' + msg.method)
    }
  }

  /**
   * @param {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").RequestMessage} msg
   */
  async request(msg) {
    const now = new Date()
    const formattedDate = now.toISOString()
    switch (msg.method) {
      case 'getFeatures': {
        /** @type {GetFeaturesResponse} */
        const response = {
          features: {
            userScripts: {
              scripts: [],
            },
            remoteResources: {
              resources: [
                {
                  id: 'privacy-configuration',
                  url: '/macos-config.json',
                  name: 'Privacy Config',
                },
                {
                  id: 'privacy-configuration-alt',
                  url: '/minimal-config.json',
                  name: 'Privacy Config (alt)',
                },
              ],
            },
          },
        }
        return response
      }
      case 'getRemoteResource': {
        const parsed = getRemoteResourceParamsSchema.parse(msg.params)
        const remote = await fetch('fixtures/macos-config.json').then((x) => x.text())
        const remote2 = await fetch('fixtures/minimal-config.json').then((x) => x.text())
        const responses = {
          'privacy-configuration': {
            id: 'privacy-configuration',
            url: '/macos-config.json',
            name: 'Privacy Config',
            current: {
              source: {
                remote: {
                  url: '/macos-config.json',
                  fetchedAt: formattedDate,
                },
              },
              contents: remote,
              contentType: 'application/json',
            },
          },
          'privacy-configuration-alt': {
            id: 'privacy-configuration-alt',
            url: '/minimal-config.json',
            name: 'Privacy Config (alt)',
            current: {
              source: {
                remote: {
                  url: '/minimal-config.json',
                  fetchedAt: formattedDate,
                },
              },
              contents: remote2,
              contentType: 'application/json',
            },
          },
        }
        const match = responses[parsed.id]
        if (!match) throw new Error('resource not found')
        return match
      }
      case 'updateResource': {
        const parsed = updateResourceParamsSchema.parse(msg.params)
        /** @type {import("../../schema/__generated__/schema.types").RemoteResource} */
        const next = {
          id: 'privacy-configuration',
          url: '/macos-config.json',
          name: 'Privacy Config',
          current: {
            source: {
              debugTools: {
                modifiedAt: formattedDate,
              },
            },
            contents: '',
            contentType: 'application/json',
          },
        }
        if ('remote' in parsed.source) {
          // await new Promise((resolve) => setTimeout(resolve, 1000))
          const remote = await fetch(parsed.source.remote.url).then((x) => x.text())
          next.current.source = {
            remote: { url: parsed.source.remote.url, fetchedAt: formattedDate },
          }
          next.current.contents = remote
        }
        if ('debugTools' in parsed.source) {
          // await new Promise((resolve) => setTimeout(resolve, 1000))
          // return Promise.reject(new Error('nooooo'))
          next.current.source = {
            debugTools: { modifiedAt: formattedDate },
          }
          next.current.contents = parsed.source.debugTools.content
        }
        return next
      }
      case 'getTabs': {
        return {
          tabs: tabData.tabs.slice(0, 2),
        }
      }
      default:
        throw new Error('unhandled message:' + msg.method)
    }
  }

  trackerTimeout = /** @type {any} */ (null)

  subscribe(msg, callback) {
    if (msg.subscriptionName === 'onTabsUpdated') {
      let interval
      let count = 0
      setInterval(() => {
        // const num = count % 3
        const next = {
          tabs: tabData.tabs.slice(0, 2),
        }
        callback(next)
        count = count + 1
      }, 5000)
      return () => {
        clearInterval(interval)
      }
    }
    if (msg.subscriptionName === 'onTrackersUpdated') {
      clearTimeout(this.trackerTimeout)
      /** @type {GetTrackersResponse} */
      const payload = {
        requests: [],
      }

      // always send empty first
      callback(payload)

      this.trackerTimeout = setTimeout(() => {
        if (trackerSubscriptions.has('empty.example.com')) {
          callback(payload)
        } else if (trackerSubscriptions.has('example.com')) {
          const output = JSON.parse(JSON.stringify(getTrackersResponse))
          const domains = Array.from(trackerSubscriptions)
          getTrackersResponseSchema.parse(output)
          for (let request of output.requests) {
            const parsed = new URL(request.pageUrl)
            parsed.host = domains[0]
            request.pageUrl = parsed.toString()
          }
          callback(output)
        }
      }, 1000)
      return () => {
        clearTimeout(this.trackerTimeout)
      }
    }
  }
}
