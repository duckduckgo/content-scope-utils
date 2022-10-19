// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MessagingTransport } from "../messaging.js";

/**
 * @implements {MessagingTransport}
 */
export class WindowsMessagingTransport {
  config;
  /**
   * @param {WindowsMessagingConfig} config
   */
  constructor(config) {
    this.config = config;
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notify(name, data = {}) {
    throw new Error("todo: implement notify for windows");
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} opts
   * @return {Promise<any>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request(name, data = {}, opts = {}) {
    throw new Error("todo: implement request for windows");
  }
}

export class WindowsMessagingConfig {
  /** @type {string} */
  featureName;
  /**
   * @param {string} featureName
   */
  constructor(featureName) {
    this.featureName = featureName;
  }

  /**
   * @template {WindowsMessagingConfig} T
   * @param {T} input
   * @returns WindowsMessagingConfig
   */
  static from(input) {
    return new WindowsMessagingConfig(input.featureName);
  }
}
