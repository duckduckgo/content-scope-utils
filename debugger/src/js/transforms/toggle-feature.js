/**
 * @typedef {import("../remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("../remote-resources/remote-resources.machine").AllowlistedTrackers} AllowlistedTrackers
 * @typedef {import("../remote-resources/remote-resources.machine.types").Serializable} Serializable
 * @typedef {import("../transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('../transforms.types').ApplyTarget} ApplyTarget
 */

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class ToggleFeature {
  subject = 'privacy-configuration'
  type = /** @type {const} */ ('PrivacyConfig.toggleFeature')
  description = 'Toggles a feature for all domains'

  /**
   * @param {object} params
   * @param {string} params.feature - the name of the feature
   */
  constructor(params) {
    this.feature = params.feature
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   */
  async transform(config) {
    return toggleFeature(config, this.feature)
  }
}

/**
 * @param {PrivacyConfig} config
 * @param {string} featureName
 * @returns {PrivacyConfig}
 */
export function toggleFeature(config, featureName) {
  const feature = config.features?.[featureName]
  feature.state = feature.state === 'enabled' ? 'disabled' : 'enabled'
  return config
}
