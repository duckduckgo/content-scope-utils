/**
 * @typedef {import("../remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("../transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('../transforms.types').ApplyTarget} ApplyTarget
 * @typedef {string} FeatureName
 */

import invariant from 'tiny-invariant'

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class ToggleUnprotected {
  type = /** @type {const} */ ('PrivacyConfig.toggleUnprotected')
  description = 'Toggles entries within unprotectedTemporary array'
  subject = 'privacy-configuration'

  /**
   * @param {string} domain
   */
  constructor(domain) {
    this.domain = domain
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   */
  async transform(config) {
    return toggleUnprotected(config, this.domain)
  }
}

/**
 * @param {PrivacyConfig} config
 * @param {string} domain
 * @return {PrivacyConfig}
 */
export function toggleUnprotected(config, domain) {
  invariant(Array.isArray(config.unprotectedTemporary), 'unprotectedTemporary should be an array')
  const prev = config.unprotectedTemporary.findIndex((x) => x.domain === domain)
  // console.log(config.unprotectedTemporary)
  if (prev === -1) {
    config.unprotectedTemporary.push({ domain, reason: 'debug tools' })
  } else {
    config.unprotectedTemporary.splice(prev, 1)
  }
  return config
}
