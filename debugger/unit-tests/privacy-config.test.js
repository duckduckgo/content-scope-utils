import { expect } from '@esm-bundle/chai'
import jsonpatch from 'fast-json-patch'
import {
  isAllowlisted,
  toggleAllowlistedTrackerUrl,
  toggleException,
  toggleFeature,
  toggleUnprotected,
  updateFeatureHash,
} from '../src/js/transforms'

const minimal = new URL('../schema/__fixtures__/minimal-config.json', import.meta.url)

// eslint-disable-next-line no-undef
describe('domain exceptions', () => {
  it('adds separate exceptions for subdomains', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))

    // make the edits
    toggleException(config, 'ampLinks', 'a.example.com')
    toggleException(config, 'ampLinks', 'example.com')

    // assert on the mutations
    expect(config.features.ampLinks.exceptions).to.deep.eq([
      {
        domain: 'freecodecamp.org',
        reason: 'https://github.com/duckduckgo/privacy-configuration/issues/328',
      },
      { domain: 'a.example.com', reason: 'debug tools' },
      { domain: 'example.com', reason: 'debug tools' },
    ])
  })
  it('toggles an existing exception', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))
    toggleException(config, 'ampLinks', 'freecodecamp.org')
    expect(config.features.ampLinks.exceptions).to.deep.eq([])
  })
})

// eslint-disable-next-line no-undef
describe('global feature toggles', () => {
  it('toggles a feature on', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))

    // turn it off
    toggleFeature(config, 'ampLinks')
    expect(config.features.ampLinks.state).to.deep.eq('disabled')

    // back on
    toggleFeature(config, 'ampLinks')
    expect(config.features.ampLinks.state).to.deep.eq('enabled')
  })
})

// eslint-disable-next-line no-undef
describe('unprotected domains', () => {
  it('toggles a domain from the unprotected list', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))

    // add domain to the unprotected list
    const result = toggleUnprotected(config, 'example.com')
    expect(result.unprotectedTemporary).to.deep.eq([
      {
        domain: 'example.com',
        reason: 'debug tools',
      },
    ])

    // remove it
    const result2 = toggleUnprotected(config, 'example.com')
    expect(result2.unprotectedTemporary).to.deep.eq([])
  })
})

// eslint-disable-next-line no-undef
describe('updating feature hash', () => {
  it('updates a feature hash after changes', async () => {
    const originalText = await fetch(minimal).then((x) => x.text())
    const original = JSON.parse(originalText)
    const nextJson = JSON.parse(originalText)

    // remember initial hash:
    const hash = nextJson.features.trackerAllowlist.hash

    // make a manual edit;
    nextJson.features.trackerAllowlist.settings.allowlistedTrackers['example.com'] = {
      rules: [
        {
          rule: 'example.com/a/b',
          domains: ['cnn.com'],
        },
      ],
    }
    const patches = jsonpatch.compare(original, nextJson)
    await updateFeatureHash(patches, nextJson)

    expect(nextJson.features.trackerAllowlist.hash).not.eq(hash)
  })
  it('doesnt alter feature hash if nothing has changed', async () => {
    const originalText = await fetch(minimal).then((x) => x.text())
    const original = JSON.parse(originalText)
    const nextJson = JSON.parse(originalText)

    // remember initial hash:
    const hash = nextJson.features.trackerAllowlist.hash

    // make a none-feature related change
    nextJson.unprotectedTemporary.push({
      domain: 'example.com',
      reason: 'debug tools',
    })

    // compare
    const patches = jsonpatch.compare(original, nextJson)

    // control: ensure patches is not empty (otherwise not testing anything)
    expect(patches.length).to.eq(1)

    // perform the update
    await updateFeatureHash(patches, nextJson)

    // hash should match
    expect(nextJson.features.trackerAllowlist.hash).to.eq(hash)
  })
  it('doesnt recompute a hash if original hash was removed', async () => {
    const originalText = await fetch(minimal).then((x) => x.text())
    const original = JSON.parse(originalText)
    const nextJson = JSON.parse(originalText)

    // eliminate the hash, like you might do in the editor
    delete nextJson.features.trackerAllowlist.hash

    // make a change that would normally cause a hash re-compute
    nextJson.features.trackerAllowlist.settings.allowlistedTrackers['example.com'] = {
      rules: [
        {
          rule: 'example.com/a/b',
          domains: ['cnn.com'],
        },
      ],
    }

    // compute patches
    const patches = jsonpatch.compare(original, nextJson)

    // control: ensure patches is not empty (otherwise not testing anything)
    expect(patches.length).to.eq(2)

    // perform the update
    await updateFeatureHash(patches, nextJson)

    // hash should still be absent
    expect(nextJson.features.trackerAllowlist.hash).to.deep.eq(undefined)
  })
})

// eslint-disable-next-line no-undef
describe('allow listing trackers', () => {
  it('matches', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))
    config.features.trackerAllowlist.settings.allowlistedTrackers['facebook.net'] = {
      rules: [
        {
          rule: 'connect.facebook.net/en_US/sdk.js',
          domains: ['bandsintown.com', 'nextdoor.co.uk', 'nextdoor.com'],
        },
        {
          rule: 'connect.facebook.net/en_US/fbevents.js',
          domains: ['example.com'],
          reason: 'debug tools',
        },
        {
          rule: 'facebook.net',
          domains: ['edition.cnn.com'],
        },
      ],
    }
    config.features.trackerAllowlist.settings.allowlistedTrackers['yottaa.com'] = {
      rules: [
        {
          rule: 'cdn.yottaa.com/rapid.min.',
          domains: ['<all>'],
          reason: 'https://github.com/duckduckgo/privacy-configuration/issues/492',
        },
        {
          rule: 'cdn.yottaa.com/rapid.security.min.',
          domains: ['<all>'],
          reason: 'https://github.com/duckduckgo/privacy-configuration/issues/830',
        },
        {
          rule: 'rapid-cdn.yottaa.com/rapid/lib/ows8CdAyrC5lTw.js',
          domains: ['scheels.com'],
          reason: 'https://github.com/duckduckgo/privacy-configuration/issues/492',
        },
      ],
    }
    const cases = [
      { trackerUrl: 'https://connect.facebook.net/en_US/sdk.js', domain: 'https://bandsintown.com', expected: true },
      { trackerUrl: 'https://connect.facebook.net/en_US/sdk.js', domain: 'https://nextdoor.co.uk', expected: true },
      { trackerUrl: 'https://connect.facebook.net/en_US/sdk.js', domain: 'https://nextdoor.com', expected: true },
      { trackerUrl: 'https://connect.facebook.net/en_US/sdk.js', domain: 'https://example.com', expected: false },
      { trackerUrl: 'https://connect.facebook.net/en_US/sdk.js', domain: 'https://edition.cnn.com', expected: false },

      {
        trackerUrl: 'https://connect.facebook.net/en_US/fbevents.js',
        domain: 'https://bandsintown.com',
        expected: false,
      },
      {
        trackerUrl: 'https://connect.facebook.net/en_US/fbevents.js',
        domain: 'https://nextdoor.co.uk',
        expected: false,
      },
      { trackerUrl: 'https://connect.facebook.net/en_US/fbevents.js', domain: 'https://nextdoor.com', expected: false },
      { trackerUrl: 'https://connect.facebook.net/en_US/fbevents.js', domain: 'https://example.com', expected: true },
      {
        trackerUrl: 'https://connect.facebook.net/en_US/fbevents.js',
        domain: 'https://edition.cnn.com',
        expected: false,
      },

      { trackerUrl: 'https://facebook.net', domain: 'https://bandsintown.com', expected: false },
      { trackerUrl: 'https://facebook.net', domain: 'https://nextdoor.co.uk', expected: false },
      { trackerUrl: 'https://facebook.net', domain: 'https://nextdoor.com', expected: false },
      { trackerUrl: 'https://facebook.net', domain: 'https://example.com', expected: false },
      { trackerUrl: 'https://facebook.net', domain: 'https://edition.cnn.com', expected: true },
      {
        trackerUrl: 'https://rapid-cdn.yottaa.com/rapid/lib/ows8CdAyrC5lTw.js',
        domain: 'https://www.scheels.com',
        expected: true,
      },
    ]

    for (const { trackerUrl, domain, expected } of cases) {
      const actual = isAllowlisted(config, trackerUrl, domain)
      expect(actual).to.eq(expected, `expect ${domain} : ${trackerUrl}`)
    }
  })
  it('respects ordering', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))
    config.features.trackerAllowlist.settings.allowlistedTrackers['facebook.net'] = {
      rules: [
        {
          rule: 'connect.facebook.net/en_US/sdk.js',
          domains: ['bandsintown.com', 'nextdoor.co.uk', 'nextdoor.com'],
        },
        {
          rule: 'facebook.net',
          domains: ['edition.cnn.com'],
        },
        {
          rule: 'connect.facebook.net/en_US/fbevents.js',
          domains: ['example.com'],
          reason: 'debug tools',
        },
      ],
    }
    const next = toggleAllowlistedTrackerUrl(config, 'https://connect.facebook.net', ['example.com'])
    expect(next.features.trackerAllowlist.settings?.allowlistedTrackers['facebook.net']).to.deep.eq({
      rules: [
        {
          rule: 'connect.facebook.net/en_US/sdk.js',
          domains: ['bandsintown.com', 'nextdoor.co.uk', 'nextdoor.com'],
        },
        {
          rule: 'connect.facebook.net/',
          domains: ['example.com'],
          reason: 'debug tools',
        },
        {
          rule: 'facebook.net',
          domains: ['edition.cnn.com'],
        },
        {
          rule: 'connect.facebook.net/en_US/fbevents.js',
          domains: ['example.com'],
          reason: 'debug tools',
        },
      ],
    })
  })
  it('toggles domain match', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))
    config.features.trackerAllowlist.settings.allowlistedTrackers['example.com'] = {
      rules: [
        {
          rule: 'example.com/',
          domains: ['scheels.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/a/b',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    }
    const next = toggleAllowlistedTrackerUrl(config, 'https://example.com', ['www.scheels.com'])
    expect(next.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'example.com/a/b',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
  })
  it('adds a new allow listed tracker', async () => {
    const original = await fetch(minimal).then((x) => x.json())
    const config = JSON.parse(JSON.stringify(original))
    const next = toggleAllowlistedTrackerUrl(config, 'https://example.com', ['<all>'])
    expect(next.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    const next2 = toggleAllowlistedTrackerUrl(config, 'https://example.com/a/b', ['mysite.com'])
    expect(next2.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'example.com/a/b',
          domains: ['mysite.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    const next3 = toggleAllowlistedTrackerUrl(config, 'https://abc.example.com/foo', ['tesco.com'])
    expect(next3.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'abc.example.com/foo',
          domains: ['tesco.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/a/b',
          domains: ['mysite.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    // add another domain to an existing rule
    const next4 = toggleAllowlistedTrackerUrl(config, 'https://abc.example.com/foo', ['edition.cnn.com'])
    expect(next4.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'abc.example.com/foo',
          domains: ['tesco.com', 'edition.cnn.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/a/b',
          domains: ['mysite.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    // // remove a domain from a rule
    const next5 = toggleAllowlistedTrackerUrl(config, 'https://abc.example.com/foo', ['edition.cnn.com'])
    expect(next5.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'abc.example.com/foo',
          domains: ['tesco.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/a/b',
          domains: ['mysite.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    // remove a rule entirely
    const next6 = toggleAllowlistedTrackerUrl(config, 'https://example.com/a/b', ['mysite.com'])
    expect(next6.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq({
      rules: [
        {
          rule: 'abc.example.com/foo',
          domains: ['tesco.com'],
          reason: 'debug tools',
        },
        {
          rule: 'example.com/',
          domains: ['<all>'],
          reason: 'debug tools',
        },
      ],
    })
    // remove a rule entirely
    const next7 = toggleAllowlistedTrackerUrl(config, 'https://example.com', ['<all>'])
    const next8 = toggleAllowlistedTrackerUrl(next7, 'https://abc.example.com/foo', ['tesco.com'])
    expect(next8.features.trackerAllowlist.settings?.allowlistedTrackers['example.com']).to.deep.eq(undefined)
  })
})
