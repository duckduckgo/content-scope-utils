/**
 * @module Messaging
 *
 * @description
 *
 * An abstraction for communications between JavaScript and host platforms.
 *
 * @example Webkit Messaging
 *
 * ```js
 * import { }
 * // This config would be injected into the UserScript
 * const injectedConfig = {
 *   hasModernWebkitAPI: true,
 *   webkitMessageHandlerNames: ["foo", "bar", "baz"],
 *   secret: "dax",
 * };
 *
 * // Then use that config to construct platform-specific configuration
 * const config = new WebkitMessagingConfig(
 *   injectedConfig.hasModernWebkitAPI,
 *   injectedConfig.webkitMessageHandlerNames,
 *   injectedConfig.secret
 * );
 *
 * // finally, get an instance of Messaging and start sending messages 🚀
 * const messaging = fromConfig(config);
 * messaging.notify("hello world!", {foo: "bar"})
 * ```
 */
import {
  WindowsMessagingConfig,
  WindowsMessagingTransport,
} from "./windows.js";

import {
  WebkitMessagingConfig,
  WebkitMessagingTransport,
  MissingWebkitHandler,
} from "./webkit.js";

/**
 * @implements {MessagingTransport}
 */
export class Messaging {
  /**
   * @type {MessagingTransport}
   */
  transport;
  /**
   * @param {MessagingTransport} transport
   */
  constructor(transport) {
    this.transport = transport;
  }
  /**
   * Send a 'fire-and-forget' message.
   * @example
   *
   * ```
   * const messaging = Messaging.fromConfig(config)
   * messaging.notify("foo", {bar: "baz"})
   * ```
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  notify(name, data = {}) {
    this.transport.notify(name, data);
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  request(name, data = {}, opts = {}) {
    return this.transport.request(name, data, opts);
  }
}

/**
 * A convenience for creating an instance of Messaging from well-formed
 * platform configuration
 * @param {WebkitMessagingConfig | WindowsMessagingConfig} config
 * @returns {Messaging}
 */
export function fromConfig(config) {
  if (config instanceof WebkitMessagingConfig) {
    const transport = new WebkitMessagingTransport(config);
    const messaging = new Messaging(transport);
    return messaging;
  }
  if (config instanceof WindowsMessagingConfig) {
    const transport = new WindowsMessagingTransport(config);
    const messaging = new Messaging(transport);
    return messaging;
  }
  throw new Error("unreachable");
}

/**
 * @interface
 */
export class MessagingTransport {
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  notify(name, data = {}) {}
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  request(name, data = {}, opts = {}) {
    throw new Error("must implement");
  }
}

/**
 * Some re-exports for convenience
 */
export { WebkitMessagingConfig, WindowsMessagingConfig, MissingWebkitHandler };
