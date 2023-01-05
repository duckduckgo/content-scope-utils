// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MessagingTransport } from '../messaging.js'

/**
 * @implements {MessagingTransport}
 */
export class WindowsMessagingTransport {
  config
  /**
   * @param {WindowsMessagingConfig} config
   */
  constructor(config) {
    this.config = config
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notify(name, data = {}) {
    windowsTransport(name, data, {})
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request(name, data = {}, opts = {}) {
    return windowsTransport(name, data, opts).withResponse(name + 'Response')
  }
}

export class WindowsMessagingConfig {
  /**
   * @param {object} params
   * @param {string} params.featureName
   */
  constructor(params) {
    /**
     * @type {string}
     */
    this.featureName = params.featureName
    /**
     * @type {"windows"}
     */
    this.platform = 'windows'
  }
}

/**
 * @param {string} name
 * @param {Record<string, any>} data
 * @param {{signal?: AbortSignal}} options
 */
function windowsTransport(name, data, options) {
  // eslint-disable-next-line no-undef
  windowsInteropPostMessage({
    Feature: 'Autofill',
    Name: name,
    Data: data,
  })
  return {
    /**
     * Sends a message and returns a Promise that resolves with the response
     * @param {string} responseId
     * @returns {Promise<*>}
     */
    withResponse(responseId) {
      return waitForWindowsResponse(responseId, options)
    },
  }
}
/**
 * @param {string} responseId
 * @param {{signal?: AbortSignal}} options
 * @returns {Promise<any>}
 */
function waitForWindowsResponse(responseId, options) {
  return new Promise((resolve, reject) => {
    // if already aborted, reject immediately
    if (options?.signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'))
    }
    /** @type {(()=>void) | undefined} */
    let teardown

    // The event handler
    /**
     * @param {MessageEvent} event
     */
    const handler = (event) => {
      // console.log(`📩 windows, ${window.location.href}`, [event.origin, JSON.stringify(event.data)])
      if (!event.data) {
        console.warn('data absent from message')
        return
      }
      if (event.data.type === responseId) {
        teardown?.()
        resolve(event.data)
      }
    }

    // what to do if this promise is aborted
    const abortHandler = () => {
      teardown?.()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    // setup
    // eslint-disable-next-line no-undef
    windowsInteropAddEventListener('message', handler)
    options?.signal?.addEventListener('abort', abortHandler)

    teardown = () => {
      // eslint-disable-next-line no-undef
      windowsInteropRemoveEventListener('message', handler)
      options?.signal?.removeEventListener('abort', abortHandler)
    }
  })
}
