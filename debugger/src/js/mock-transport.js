import {
  getRemoteResourceParamsSchema,
  getTrackersResponseSchema,
  subscribeToTrackersParamsSchema,
  updateResourceParamsSchema,
} from '../../schema/__generated__/schema.parsers.mjs'

import getTrackersResponse from '../../schema/__fixtures__/__getTrackers__.json'
import invariant from 'tiny-invariant'

/**
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingTransport} MessagingTransport
 * @typedef {import("../../schema/__generated__/schema.types").GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../schema/__generated__/schema.types').GetTrackersResponse} GetTrackersResponse
 * @typedef {import('../../schema/__generated__/schema.types').RemoteResourceRef} RemoteResourceRef
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

/** @type {Record<string, RemoteResourceRef>} */
const defaults = {
  'privacy-configuration': {
    id: 'privacy-configuration',
    url: 'fixtures/macos-config.json',
    name: 'Privacy Config',
    kind: 'privacy-configuration',
  },
  'text-file-01': {
    id: 'text-file-01',
    url: 'fixtures/minimal-config.json',
    name: 'Text file example',
    kind: 'text',
  },
}

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
              resources: [defaults['privacy-configuration'], defaults['text-file-01']],
            },
          },
        }
        return response
      }
      case 'getRemoteResource': {
        const parsed = getRemoteResourceParamsSchema.parse(msg.params)
        invariant(parsed.id in defaults, 'can only update resources we know about')
        let content
        if (parsed.id === 'privacy-configuration') {
          content = await fetch('fixtures/macos-config.json').then((x) => x.text())
        } else if (parsed.id === 'text-file-01') {
          content = await fetch('fixtures/minimal-config.json').then((x) => x.text())
        }
        return {
          ...defaults[parsed.id],
          current: {
            source: {
              remote: {
                url: defaults[parsed.id].url,
                fetchedAt: formattedDate,
              },
            },
            contents: content,
            contentType: 'application/json',
          },
        }
      }
      case 'updateResource': {
        const parsed = updateResourceParamsSchema.parse(msg.params)
        /** @type {import("../../schema/__generated__/schema.types").RemoteResource} */

        invariant(parsed.id in defaults, 'can only update resources we know about')
        const next = {
          ...defaults[parsed.id],
        }

        if ('remote' in parsed.source) {
          const remoteContent = await fetch(parsed.source.remote.url).then((x) => x.text())
          return {
            ...defaults[parsed.id],
            current: {
              source: {
                remote: { url: parsed.source.remote.url, fetchedAt: formattedDate },
              },
              contents: remoteContent,
              contentType: 'application/json',
            },
          }
        }
        if ('debugTools' in parsed.source) {
          return {
            ...defaults[parsed.id],
            current: {
              source: {
                debugTools: { modifiedAt: formattedDate },
              },
              contents: parsed.source.debugTools.content,
              contentType: 'application/json',
            },
          }
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
