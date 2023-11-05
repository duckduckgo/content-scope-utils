/**
 * @typedef {import("../remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("../transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('../transforms.types').ApplyTarget} ApplyTarget
 */

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class UpdateVersion {
  type = /** @type {const} */ ('PrivacyConfig.updateVersion')
  description = 'Updates the version number'
  subject = 'privacy-configuration'

  /**
   * @param {number} version
   */
  constructor(version) {
    this.version = version
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   */
  async transform(config) {
    config.version = this.version
    return config
  }
}
