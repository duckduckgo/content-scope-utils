/**
 * @module Messaging
 *
 * @description
 *
 * An abstraction for communications between JavaScript and host platforms.
 *
 * 1) First you construct your platform-specific configuration (eg: {@link WebkitMessagingConfig})
 * 2) Then use that to get an instance of the Messaging utility which allows
 * you to send and receive data in a unified way
 * 3) Each platform implements {@link MessagingTransport} along with its own Configuration
 *     - For example, to learn what configuration is required for Webkit, see: {@link "Webkit Messaging".WebkitMessagingConfig}
 *     - Or, to learn about how messages are sent and received in Webkit, see {@link "Webkit Messaging".WebkitMessagingTransport}
 *
 * @example Webkit Messaging
 *
 * ```js
 * import { Messaging, WebkitMessagingConfig } from "@duckduckgo/content-scope-scripts/lib/messaging.js"
 *
 * // This config would be injected into the UserScript
 * const injectedConfig = {
 *   hasModernWebkitAPI: true,
 *   webkitMessageHandlerNames: ["foo", "bar", "baz"],
 *   secret: "dax",
 * };
 *
 * // Then use that config to construct platform-specific configuration
 * const config = WebkitMessagingConfig.from(injectedConfig);
 *
 * // finally, get an instance of Messaging and start sending messages in a unified way 🚀
 * const messaging = fromConfig(config);
 * messaging.notify("hello world!", {foo: "bar"})
 *
 * ```
 *
 * @example Windows Messaging
 *
 * ```js
 * import { Messaging, WindowsMessagingConfig } from "@duckduckgo/content-scope-scripts/lib/messaging.js"
 *
 * // Messaging on Windows is namespaced, so you can create multiple messaging instances
 * const autofillConfig  = WindowsMessagingConfig.from({ featureName: "Autofill" });
 * const debugConfig     = WindowsMessagingConfig.from({ featureName: "Debugging" });
 *
 * const autofillMessaging = fromConfig(autofillConfig);
 * const debugMessaging    = fromConfig(debugConfig);
 *
 * // Now send messages to both features as needed 🚀
 * autofillMessaging.notify("storeFormData", { "username": "dax" })
 * debugMessaging.notify("pageLoad", { time: window.performance.now() })
 * ```
 */
import { WindowsMessagingConfig, WindowsMessagingTransport } from "./messaging/windows.js";
import { WebkitMessagingConfig, WebkitMessagingTransport } from "./messaging/webkit.js";

/**
 * @implements {MessagingTransport}
 */
export class Messaging {
  /**
   * @param {MessagingTransport} transport
   */
  constructor(transport) {
    this.transport = transport;
  }
  /**
   * Send a 'fire-and-forget' message.
   * @throws
   * {@link MissingHandler}
   *
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
   * Send a request, and wait for a response
   * @throws
   * {@link MissingHandler}
   *
   * @example
   * ```
   * const messaging = Messaging.fromConfig(config)
   * const response = await messaging.request("foo", {bar: "baz"})
   * ```
   *
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
   * @returns {void}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notify(name, data = {}) {
    throw new Error("must implement 'notify'");
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request(name, data = {}, opts = {}) {
    throw new Error("must implement");
  }
}

/**
 * Thrown when a handler cannot be found
 */
export class MissingHandler extends Error {
  /**
   * @param {string} message
   * @param {string} handlerName
   */
  constructor(message, handlerName) {
    super(message);
    this.handlerName = handlerName;
  }
}

/**
 * Some re-exports for convenience
 */
export { WebkitMessagingConfig, WindowsMessagingConfig };
