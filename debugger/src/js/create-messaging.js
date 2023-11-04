import {
  Messaging,
  MessagingContext,
  TestTransportConfig,
  WebkitMessagingConfig,
  WindowsMessagingConfig,
} from '@duckduckgo/content-scope-scripts/packages/messaging'

/**
 * @param {object} opts
 * @param {ImportMeta["env"]} opts.env
 * @param {import('../../integration-tests/page-objects/debug-tools').GlobalConfig["transport"]} opts.transport
 * @param {ImportMeta["injectName"] | 'http'} opts.injectName
 * @param {string} opts.featureName
 * @param {() => import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingTransport} [opts.mockImpl]
 * @param {(ctx: MessagingContext) => import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingTransport} [opts.httpImpl]
 */
export function createSpecialPagesMessaging(opts) {
  const messageContext = new MessagingContext({
    context: 'specialPages',
    featureName: opts.featureName,
    env: opts.env,
  })
  if (opts.transport === 'http' && opts.httpImpl) {
    const config = new TestTransportConfig(opts.httpImpl(messageContext))
    return new Messaging(messageContext, config)
  }
  if (opts.injectName === 'windows') {
    const opts = new WindowsMessagingConfig({
      methods: {
        // @ts-expect-error - not in @types/chrome
        postMessage: window.chrome.webview.postMessage,
        // @ts-expect-error - not in @types/chrome
        addEventListener: window.chrome.webview.addEventListener,
        // @ts-expect-error - not in @types/chrome
        removeEventListener: window.chrome.webview.removeEventListener,
      },
    })
    return new Messaging(messageContext, opts)
  } else if (opts.injectName === 'apple') {
    const opts = new WebkitMessagingConfig({
      hasModernWebkitAPI: true,
      secret: '',
      webkitMessageHandlerNames: ['specialPages'],
    })
    return new Messaging(messageContext, opts)
  } else if (opts.injectName === 'integration' && opts.mockImpl) {
    const config = new TestTransportConfig(opts.mockImpl())
    return new Messaging(messageContext, config)
  }
  throw new Error('unreachable - platform not supported')
}
