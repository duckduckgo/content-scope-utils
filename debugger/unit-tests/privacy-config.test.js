import { expect } from '@esm-bundle/chai'
import jsonpatch from 'fast-json-patch'
import { toggleException, toggleFeature, toggleUnprotected, updateFeatureHash } from '../src/js/transforms'

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
