import invariant from 'tiny-invariant'
import { parse } from 'tldts'

/**
 * @typedef {import("./remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 * @typedef {import("./remote-resources/remote-resources.machine").AllowlistedTrackers} AllowlistedTrackers
 * @typedef {import("./transforms.types").PrivacyConfigurationTransform} PrivacyConfigurationTransform
 * @typedef {import('./transforms.types').ApplyTarget} ApplyTarget
 * @typedef {string} FeatureName
 */

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class ToggleFeatureDomain {
  static props = /** @type {const} */ ({
    type: 'PrivacyConfig.toggleFeatureDomain',
    subject: 'privacy-configuration',
    description: 'Toggles a feature for a given domain',
  })
  description = () => ToggleFeatureDomain.props.description

  /**
   * @param {object} params
   * @param {string} params.feature
   * @param {string} params.domain
   */
  constructor(params) {
    this.feature = params.feature
    this.domain = params.domain
  }

  /**
   * @param {PrivacyConfig} config
   * @return {PrivacyConfig}
   */
  transform(config) {
    return toggleException(config, this.feature, this.domain)
  }
}

/**
 * @implements {PrivacyConfigurationTransform}
 */
export class ToggleFeature {
  static props = /** @type {const} */ ({
    type: 'PrivacyConfig.toggleFeature',
    subject: 'privacy-configuration',
    description: 'Toggles a feature for all domains',
  })

  description = () => ToggleFeature.props.description

  /**
   * @param {object} params
   * @param {string} params.feature - the name of the feature
   */
  constructor(params) {
    this.feature = params.feature
  }

  /**
   * @param {PrivacyConfig} config
   * @return {PrivacyConfig}
   */
  transform(config) {
    return toggleFeature(config, this.feature)
  }
}

export const lookup = {
  [ToggleFeatureDomain.props.type]: ToggleFeatureDomain,
  [ToggleFeature.props.type]: ToggleFeature,
}

/**
 * @param {PrivacyConfig} config
 * @param {import('./transforms.types').Lookup<typeof lookup>} command
 * @returns {import('./transforms.types').TransformResult<Record<string, any>>}
 */
export function handler2(config, command) {
  if (lookup[command.type]) {
    // @ts-ignore
    const instance = new lookup[command.type](command.args)
    return tryCatch(() => instance.transform(config))
  }
  throw new Error('unreachable')
}

/**
 * @param {PrivacyConfig} config
 * @param {import('./transforms.types').PrivacyConfigTransformMethods} command
 * @returns {import('./transforms.types').TransformResult<Record<string, any>>}
 */
export function handler(config, command) {
  switch (command.kind) {
    case 'PrivacyConfig.toggleUnprotectedDomain': {
      return tryCatch(() => toggleUnprotected(config, command.domain))
    }
    case 'PrivacyConfig.toggleAllowlistedTrackerUrl': {
      const allowList = config.features?.trackerAllowlist?.settings?.allowlistedTrackers
      return tryCatch(() => {
        toggleAllowlistedTrackerUrl(allowList, command.trackerUrl, command.applyTo, { includePath: true })
        return config
      })
    }
    case 'PrivacyConfig.toggleAllowlistedTrackerDomain': {
      const allowList = config.features?.trackerAllowlist?.settings?.allowlistedTrackers
      return tryCatch(() => {
        toggleAllowlistedTrackerUrl(allowList, command.trackerUrl, command.applyTo, { includePath: false })
        return config
      })
    }
  }
  return { error: { message: 'command not handled' }, ok: false }
}

function tryCatch(fn) {
  try {
    return /** @type {const} */ ({ success: fn(), ok: true })
  } catch (e) {
    console.error(e)
    // @ts-ignore
    return /** @type {const} */ ({ error: { message: e.message }, ok: false })
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

/**
 * @param {Record<string, any>} config
 * @param {string} domain
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

/**
 * @param {AllowlistedTrackers} allowList
 * @param {string} trackerUrl
 * @param {ApplyTarget[]} applyTargets
 * @param {{includePath: boolean}} opts
 * @returns {AllowlistedTrackers}
 */
export function toggleAllowlistedTrackerUrl(allowList, trackerUrl, applyTargets, opts) {
  invariant(allowList, 'allowlistedTrackers must be present on setttings of trackerAllowlist')
  const parsed = parse(trackerUrl)
  let url
  try {
    url = new URL(trackerUrl)
  } catch (e) {
    if (parsed.hostname) {
      url = new URL('https://' + parsed.hostname)
    } else {
      throw new Error('invalid URL input')
    }
  }
  invariant(parsed.domain, 'must have domain')
  allowList[parsed.domain] ??= { rules: [] }

  // format is like example.com/a/b.js
  let nextRule = `${url.hostname}`
  if (opts.includePath) {
    nextRule += url.pathname
  }

  // is this rule already there?
  const matchingRule = allowList[parsed.domain].rules.find((x) => x.rule === nextRule)

  if (matchingRule) {
    /** @type {string[]} */
    const addOps = []
    /** @type {string[]} */
    const removeOps = []
    for (let applyTarget of applyTargets) {
      if ('all' in applyTarget && matchingRule.domains.includes('<all>')) {
        removeOps.push('<all>')
      } else if ('domain' in applyTarget) {
        const parsed = parse(applyTarget.domain)
        if (parsed.hostname && matchingRule.domains.includes(parsed.hostname)) {
          removeOps.push(parsed.hostname)
        } else if (parsed.domain && matchingRule.domains.includes(parsed.domain)) {
          removeOps.push(parsed.domain)
        } else {
          addOps.push(applyTarget.domain)
        }
      }
    }
    const filteredDomains = matchingRule.domains.filter((domain) => !removeOps.includes(domain))
    filteredDomains.push(...addOps)
    const nextDomains = new Set(filteredDomains)
    matchingRule.domains = Array.from(nextDomains)

    if (matchingRule.domains.length === 0) {
      const nextRules = allowList[parsed.domain].rules.filter((rule) => rule !== matchingRule)
      if (nextRules.length === 0) {
        delete allowList[parsed.domain]
      } else {
        allowList[parsed.domain].rules = nextRules
      }
    }
  } else {
    const rule = {
      rule: nextRule,
      domains: applyTargets.map((x) => ('domain' in x ? x.domain : '<all>')),
      reason: 'debug tools',
    }

    const rule_domain_score = nextRule.split('.').length
    const rule_path_score = url.pathname.split('/').length
    const insert = allowList[parsed.domain].rules.findIndex((r) => {
      const [a_domain, ...a_path] = r.rule.split(/\//g)
      const domain_score = a_domain.split('.').length
      const path_score = a_path.filter(Boolean).length
      if (domain_score < rule_domain_score) {
        return true
      }
      if (domain_score === rule_domain_score) {
        if (path_score < rule_path_score) {
          return true
        }
      }
      return false
    })

    if (insert === -1) {
      allowList[parsed.domain].rules.push(rule)
    } else {
      allowList[parsed.domain].rules.splice(insert, 0, rule)
    }
  }

  return allowList
}

/**
 * @param {PrivacyConfig} config
 * @param {string} trackerUrl
 * @param {string} domain
 * @return {*|boolean}
 */
export function isAllowlisted(config, trackerUrl, domain) {
  const allowList = config.features?.trackerAllowlist?.settings?.allowlistedTrackers
  if (!allowList) return false
  const parsed = parse(trackerUrl)
  const parsedDomain = parse(domain)
  invariant(parsed.domain, 'must have domain')
  const rules = allowList[parsed.domain]?.rules
  if (!rules) return false

  const url = new URL(trackerUrl)
  const nextRule = `${url.hostname}${url.pathname}`
  const matchingRule = rules.find((x) => {
    let normalized_a = x.rule.replace(/\/$/, '')
    let normalized_b = nextRule.replace(/\/$/, '')
    return normalized_a === normalized_b
  })
  if (!matchingRule) return false
  return matchingRule.domains.includes(parsedDomain.hostname) || matchingRule.domains.includes(parsedDomain.domain)
}

/**
 * @param {PrivacyConfig} config
 * @returns {Promise<PrivacyConfig>}
 */
export async function updateVersion(config) {
  config.version = Date.now()
  return config
}

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
