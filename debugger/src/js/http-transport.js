/**
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingTransport} MessagingTransport
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingContext} MessagingContext
 * @typedef {import("../../schema/__generated__/schema.types").GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../schema/__generated__/schema.types').GetTrackersResponse} GetTrackersResponse
 */

/**
 * @implements MessagingTransport
 */
export class HttpImpl {
  /**
   * @param {MessagingContext} ctx
   */
  constructor(ctx) {
    this.ctx = ctx
  }
  notify(msg) {
    switch (msg.method) {
      case 'subscribeToTrackers': {
        console.warn('subscribeToTrackers not implemented')
        break
      }
      case 'unsubscribeToTrackers': {
        console.warn('unsubscribeToTrackers not implemented')
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
    if (msg.method === 'getTabs') return { tabs: [] }
    let path = `/${this.ctx.context}/${this.ctx.featureName}`
    const url = new URL(path, location.href)
    const res = fetch(url, {
      method: 'POST',
      body: JSON.stringify(msg),
      headers: {
        'content-type': 'application/json',
      },
    })

    return res.then((res) => {
      if (res.ok) {
        return res.json().then((json) => json.result || {})
      }
      return res.text().then((text) => {
        console.log(text)
        throw new Error(text)
      })
    })
  }

  subscribe(msg) {
    console.warn('subscription not implemented', msg.subscriptionName)
    // if (msg.subscriptionName === 'onTabsUpdated') {
    //   throw new Error("msg.onTabsUpdated === 'onTrackersUpdated' not implemented")
    // }
    // if (msg.subscriptionName === 'onTrackersUpdated') {
    //   throw new Error("msg.subscriptionName === 'onTrackersUpdated' not implemented")
    // }
    return () => {}
  }
}
