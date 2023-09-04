import invariant from 'tiny-invariant'
import { parse } from 'tldts'

/**
 * @typedef {import("./remote-resources/remote-resources.machine").PrivacyConfig} PrivacyConfig
 */

/**
 * @param {PrivacyConfig} config
 * @param {import('./transforms.types').PrivacyConfigTransformMethods} command
 * @returns {import('./transforms.types').TransformResult<Record<string, any>>}
 */
export function handler(config, command) {
  switch (command.kind) {
    case 'PrivacyConfig.toggleFeatureDomain': {
      // toggle a feature + domain exception
      return tryCatch(() => toggleException(config, command.feature, command.domain))
    }
    case 'PrivacyConfig.toggleFeature': {
      return tryCatch(() => toggleFeature(config, command.feature))
    }
    case 'PrivacyConfig.toggleUnprotectedDomain': {
      return tryCatch(() => toggleUnprotected(config, command.domain))
    }
    case 'PrivacyConfig.toggleAllowlistedTrackerUrl': {
      return tryCatch(() => toggleAllowlistedTrackerUrl(config, command.trackerUrl, command.domains))
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
 * @param {Record<string, any>} config
 * @param {string} featureName
 * @param {string} domain
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
 * @param {Record<string, any>} config
 * @param {string} featureName
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
 * @param {PrivacyConfig} config
 * @param {string} trackerUrl
 * @param {string[]} domains
 * @returns {PrivacyConfig}
 */
export function toggleAllowlistedTrackerUrl(config, trackerUrl, domains) {
  const allowList = config.features?.trackerAllowlist?.settings?.allowlistedTrackers
  invariant(allowList, 'allowlistedTrackers must be present on setttings of trackerAllowlist')
  const parsed = parse(trackerUrl)
  const url = new URL(trackerUrl)
  invariant(parsed.domain, 'must have domain')
  allowList[parsed.domain] ??= { rules: [] }

  // format is like example.com/a/b.js
  const nextRule = `${url.hostname}${url.pathname}`

  // is this rule already there?
  const matchingRule = allowList[parsed.domain].rules.find((x) => x.rule === nextRule)

  if (matchingRule) {
    const addOps = []
    const removeOps = []
    for (let incomingDomain of domains) {
      if (matchingRule.domains.includes(incomingDomain)) {
        removeOps.push(incomingDomain)
      } else {
        addOps.push(incomingDomain)
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
    allowList[parsed.domain].rules.push({
      rule: nextRule,
      domains: domains,
      reason: 'debug tools',
    })
  }
  if (!allowList[parsed.domain]) return config

  allowList[parsed.domain].rules.sort((a, b) => {
    const [a_domain, ...a_path] = a.rule.split(/\//g)
    const [b_domain, ...b_path] = b.rule.split(/\//g)

    const a_domain_len = a_domain.split('.').length
    const b_domain_len = b_domain.split('.').length

    if (a_domain_len !== b_domain_len) {
      return b_domain_len - a_domain_len
    }

    const a_path_len = a_path.length
    const b_path_len = b_path.length
    return b_path_len - a_path_len
  })

  return config
}

/**
 * @param {import("fast-json-patch").Operation[]} patches
 * @param {PrivacyConfig} config
 * @returns {Promise<PrivacyConfig>}
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
