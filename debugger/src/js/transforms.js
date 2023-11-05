import { ToggleFeatureDomain } from './transforms/toggle-feature-domain'
import { ToggleFeature } from './transforms/toggle-feature'
import { UpdateVersion } from './transforms/update-version'
import { ToggleAllowlistedTracker } from './transforms/allow-list'
import { ToggleUnprotected } from './transforms/toggle-unprotected'

/**
 * @typedef {import("./remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("./remote-resources/remote-resources.machine").AllowlistedTrackers} AllowlistedTrackers
 * @typedef {import("./remote-resources/remote-resources.machine.types").Serializable} Serializable
 * @typedef {import("./transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('./transforms.types').ApplyTarget} ApplyTarget
 */

/**
 * @param {import('./remote-resources/remote-resources.machine.types').TransformCommands} input
 * @returns {PrivacyConfigurationTransform}
 */
function deserializeCommand(input) {
  switch (input.type) {
    case 'PrivacyConfig.updateVersion':
      return new UpdateVersion(input.payload)
    case 'PrivacyConfig.toggleFeatureDomain':
      return new ToggleFeatureDomain(input.payload)
    case 'PrivacyConfig.toggleFeature':
      return new ToggleFeature(input.payload)
    case 'PrivacyConfig.toggleUnprotected':
      return new ToggleUnprotected(input.payload)
    case 'PrivacyConfig.toggleAllowlistedTracker':
      return new ToggleAllowlistedTracker(input.payload)
    default:
      throw new Error('unhandled ' + input)
  }
}

/**
 * @param {PrivacyConfig} config
 * @param {import('./remote-resources/remote-resources.machine.types').TransformCommands} command
 * @returns {Promise<import('./transforms.types').TransformResult<Record<string, any>>>}
 */
export async function handler2(config, command) {
  const instance = deserializeCommand(command)
  try {
    return /** @type {const} */ ({ success: await instance.transform(config), ok: true })
  } catch (e) {
    console.error(e)
    // @ts-ignore
    return /** @type {const} */ ({ error: { message: e.message }, ok: false })
  }
}

/**
 * @param input
 */
export function extractUrls(input) {
  const lines = input.trim().split(/\n\r/g)
  const segments = lines.map((line) => line.split(' ').filter(Boolean)).flat()

  // parse urls and wipe out the search param
  const urls = /** @type {URL[]} */ (
    segments
      .map((seg) => {
        try {
          const url = new URL(seg)
          return url
        } catch {
          return false
        }
      })
      .filter(Boolean)
  )

  const comparables = urls.map((x) => {
    const clone = new URL(x)
    clone.search = ''
    clone.hash = ''
    return clone
  })

  const unique = /** @type {URL[]} */ ([...new Set(comparables.map((url) => url.href))].map((x) => new URL(x)))

  return { urls, unique }
}
