import { MessagingTransport } from "./messaging";

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

export class WindowsMessagingConfig {
  /** @type {string} the name */
  featureName;
  /**
   * @param {string} featureName
   */
  constructor(featureName) {
    this.featureName = featureName;
  }
}
