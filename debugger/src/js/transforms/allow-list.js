import invariant from 'tiny-invariant'
import { parse } from 'tldts'

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
export class ToggleAllowlistedTracker {
  type = /** @type {const} */ ('PrivacyConfig.toggleAllowlistedTracker')
  description = 'Toggles a tracker url in the allowlist'
  subject = 'privacy-configuration'

  /**
   * @param {object} params
   * @param {string} params.trackerUrl
   * @param {ApplyTarget[]} params.applyTo
   * @param {{ includePath: boolean }} params.opts
   */
  constructor(params) {
    this.trackerUrl = params.trackerUrl
    this.applyTo = params.applyTo
    this.opts = params.opts
  }

  /**
   * @param {PrivacyConfig} config
   * @return {Promise<PrivacyConfig>}
   */
  async transform(config) {
    const allowList = config.features?.trackerAllowlist?.settings?.allowlistedTrackers
    const nextAllowList = toggleAllowlistedTrackerUrl(allowList, this.trackerUrl, this.applyTo, this.opts)
    // @ts-ignore
    config.features.trackerAllowlist.settings.allowlistedTrackers = nextAllowList
    return config
  }
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
