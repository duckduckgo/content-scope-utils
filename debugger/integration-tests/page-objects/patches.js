import jsonpatch from 'fast-json-patch'
import { expect } from '@playwright/test'
import { ResourcePatches, STORAGE_KEY } from '../../src/js/remote-resources/patches-machine'

export class Patches {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {import("./editor").Editor} editor
   */
  constructor(page, editor) {
    this.page = page
    this.editor = editor
    this.$ = new (class Selectors {
      copyOverridePatch = () => page.getByRole('button', { name: 'Copy as Patch' })
    })()
  }

  /**
   * @param {Record<string, any>} before
   * @param {Record<string, any>} after
   */
  async copyPatchFromOverride(before, after) {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await this.$.copyOverridePatch().click()
    const clipboardPatches = await this.page.evaluate(() => navigator.clipboard.readText())
    const patches = jsonpatch.compare(before, after)
    expect(JSON.parse(clipboardPatches)).toEqual(patches)
  }

  /**
   * @param {string} resourceId
   * @param {Record<string, any>} before
   * @param {Record<string, any>} after
   */
  async patchIsStoredInLocalStorage(resourceId, before, after) {
    const json = await this.page.evaluate(({ STORAGE_KEY }) => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), {
      STORAGE_KEY,
    })
    const actual = ResourcePatches.parse(json)
    const matching = actual[resourceId]
    const expected = jsonpatch.compare(before, after)
    expect(matching[0].patches).toEqual(expected)
  }

  async withExistingPatches() {
    /** @type {ResourcePatches} */
    const value = {
      'privacy-configuration': [
        {
          createdAt: '2023-08-15T20:41:34.385Z',
          resourceId: 'privacy-configuration',
          kind: 'json-fast-patch',
          patches: [{ path: '/features/abc/settings/d', op: 'add', value: { e: 'f' } }],
        },
      ],
    }
    await this.page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value)
      },
      { key: STORAGE_KEY, value: JSON.stringify(value) },
    )
  }
}
