/**
 * @typedef {import("../remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("../remote-resources/remote-resources.machine").AllowlistedTrackers} AllowlistedTrackers
 * @typedef {import("../remote-resources/remote-resources.machine.types").Serializable} Serializable
 * @typedef {import("../transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('../transforms.types').ApplyTarget} ApplyTarget
 * @typedef {string} FeatureName
 */

import invariant from 'tiny-invariant'

/**
 * @implements PrivacyConfigurationTransform - {@link PrivacyConfigurationTransform}
 * @example
 *
 * Send this event to toggle a feature 'off' for a given feature. This will add an entry in the
 * `exceptions` array
 *
 * ```js
 * send({
 *    type: 'PrivacyConfig.toggleFeatureDomain',
 *    payload: {
 *      feature: 'navigatorInterface',
 *      domain: 'example.com',
 *    },
 *  })
 * ```
 */
export class ToggleFeatureDomain {
  type = /** @type {const} */ ('PrivacyConfig.toggleFeatureDomain')
  subject = 'privacy-configuration'
  description = 'Toggles a feature for a given domain'

  /**
   * @internal
   * @param {object} params
   * @param {string} params.feature
   * @param {string} params.domain
   */
  constructor(params) {
    this.params = {
      /**
       * The name of the feature as it appears in the config - such as `navigatorInterface`
       */
      feature: params.feature,
      /**
       * The domain where the toggle will be applied as an 'exception'
       */
      domain: params.domain,
    }
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   * @internal
   */
  async transform(config) {
    return toggleException(config, this.params.feature, this.params.domain)
  }
}

/**
 * @param {PrivacyConfig} config
 * @param {string} featureName
 * @param {string} domain
 * @return {PrivacyConfig}
 */
export function toggleException(config, featureName, domain) {
  // sanity check on the structure
  const exceptions = config.features?.[featureName]?.exceptions
  invariant(Array.isArray(exceptions), 'exceptions should be an array')

  // mutate the array
  const prev = exceptions.findIndex((x) => x.domain === domain)
  if (prev === -1) {
    exceptions.push({ domain: domain, reason: 'debug tools' })
  } else {
    exceptions.splice(prev, 1)
  }
  return config
}
