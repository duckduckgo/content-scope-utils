import jsonpatch from 'fast-json-patch'
/**
 * @typedef {import("../remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("../transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 */

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class UpdateFeatureHash {
  type = /** @type {const} */ ('PrivacyConfig.updateFeatureHash')
  description = 'Updates the version number'
  subject = 'privacy-configuration'

  /**
   * @param {object} params
   * @param {PrivacyConfig} params.original
   */
  constructor(params) {
    this.original = params.original
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   */
  async transform(config) {
    const patches = jsonpatch.compare(this.original, config)
    let nextConfig = await updateFeatureHash(patches, config)
    return nextConfig
  }
}

/**
 * @param {import('fast-json-patch').Operation[]} patches
 * @param {PrivacyConfig} config
 */
export async function updateFeatureHash(patches, config) {
  const changedFeatures = new Set()

  // first look at every patch to determine if this feature wsa changed
  for (let patch of patches) {
    const [first, featureName] = patch.path.split('/').filter(Boolean)
    if (changedFeatures.has(featureName)) continue

    if (first === 'features' && featureName in config.features) {
      changedFeatures.add(featureName)
    }
  }

  // now go through each changed feature and re-compute a new hash for it
  for (let changedFeature of changedFeatures) {
    const prev = config.features[changedFeature].hash

    // don't alter the hash if it was previously absent
    if (!prev || typeof prev !== 'string') {
      continue
    }

    // compute and re-assign to `hash`
    const featureAsString = JSON.stringify(config.features[changedFeature])
    config.features[changedFeature].hash = await sha256(featureAsString)
  }
  return config
}

/**
 * @param {string} s
 * @return {Promise<string>}
 */
async function sha256(s) {
  const buf = new TextEncoder().encode(s)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
